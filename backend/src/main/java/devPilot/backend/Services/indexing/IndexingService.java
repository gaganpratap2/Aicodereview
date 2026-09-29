package devPilot.backend.Services.indexing;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import devPilot.backend.Exception.NotFoundException;
import devPilot.backend.Repository.RepositoryRepository;
import devPilot.backend.Services.UserService;
import devPilot.backend.Services.ai.RagSettings;
import devPilot.backend.Services.github.GitHubRateLimiter;
import devPilot.backend.Services.github.GithubApiClient;
import devPilot.backend.entity.IndexStatus;
import devPilot.backend.entity.Repository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndexingService {

    private static final int VECTOR_BATCH_SIZE = 32;
    private static final int PROGRESS_EVERY_N_FILES = 5;

    private final RepositoryRepository repositoryRepository;
    private final UserService userService;
    private final GithubApiClient gitHubApiClient;
    private final CodeFileFilter fileFilter;
    private final CodeChunker codeChunker;
    private final GitHubRateLimiter rateLimiter;
    private final VectorStore vectorStore;

    @Value("${app.indexing.max-file-bytes:102400}")
    private long maxFileBytes;

    /**
     * Marks a repository as INDEXING.
     *
     * This method is synchronous. The actual indexing is started separately
     * through indexAsync().
     */
    @Transactional
    public Repository startIndexing(UUID repoId, UUID userId) {

        Repository repo = repositoryRepository
                .findByIdAndUserId(repoId, userId)
                .orElseThrow(() ->
                        new NotFoundException("Repository not found"));

        if (repo.getIndexStatus() == IndexStatus.INDEXING) {
            throw new IllegalStateException(
                    "Repository is already being indexed");
        }

        repo.setIndexStatus(IndexStatus.INDEXING);
        repo.setFilesProcessed(0);
        repo.setFilesTotal(0);
        repo.setChunkCount(0);
        repo.setErrorMessage(null);
        repo.setUpdatedAt(Instant.now());

        return repositoryRepository.save(repo);
    }

    /**
     * Runs repository indexing asynchronously.
     */
    @Async("indexingExecutor")
    public void indexAsync(UUID repoId, UUID userId) {

        try {
            doIndex(repoId, userId);

        } catch (Exception ex) {

            log.error(
                    "Indexing failed for repository {}",
                    repoId,
                    ex
            );

            markFailed(repoId, ex.getMessage());
        }
    }

    /**
     * Main indexing workflow.
     */
    private void doIndex(UUID repoId, UUID userId) {

        Repository repo = repositoryRepository
                .findById(repoId)
                .orElseThrow(() ->
                        new NotFoundException("Repository not found"));

        String token = userService.decryptAccessToken(
                userService.requireById(userId)
        );

        /*
         * Remove old vectors before creating new ones.
         *
         * If deletion fails, stop indexing. Otherwise the vector store
         * could contain both old and new repository data.
         */
        deleteExistingVectors(repoId.toString());

        /*
         * Get repository tree from GitHub.
         */
        Map<String, Object> tree = gitHubApiClient.getRepoTree(
                token,
                repo.getOwner(),
                repo.getName(),
                repo.getDefaultBranch()
        );

        /*
         * Select only files that are suitable for indexing.
         */
        List<String> filePaths = listIndexableFiles(tree);

        updateProgress(
                repoId,
                filePaths.size(),
                0,
                0
        );

        List<Document> batch = new ArrayList<>(VECTOR_BATCH_SIZE);

        int processedFiles = 0;
        int successfulFiles = 0;
        int failedFiles = 0;
        int totalChunks = 0;

        for (String path : filePaths) {

            try {

                /*
                 * Download file content from GitHub.
                 */
                String content = gitHubApiClient.getFileContent(
                        token,
                        repo.getOwner(),
                        repo.getName(),
                        path
                );

                /*
                 * Split source code into chunks.
                 */
                List<Document> chunks =
                        codeChunker.chunkFile(
                                repoId.toString(),
                                path,
                                content
                        );

                /*
                 * Add chunks to the vector-store batch.
                 */
                batch.addAll(chunks);

                totalChunks += chunks.size();
                successfulFiles++;

                /*
                 * Persist vectors in batches.
                 */
                if (batch.size() >= VECTOR_BATCH_SIZE) {

                    vectorStore.add(batch);

                    batch.clear();
                }

            } catch (Exception ex) {

                failedFiles++;

                log.warn(
                        "Skipping file {} in {}: {}",
                        path,
                        repo.getFullName(),
                        ex.getMessage()
                );
            }

            processedFiles++;

            /*
             * Update progress periodically rather than after every file.
             */
            if (processedFiles % PROGRESS_EVERY_N_FILES == 0
                    || processedFiles == filePaths.size()) {

                updateProgress(
                        repoId,
                        filePaths.size(),
                        processedFiles,
                        totalChunks
                );
            }

            /*
             * Respect GitHub API rate limits.
             */
            rateLimiter.pause();
        }

        /*
         * Persist remaining chunks.
         */
        if (!batch.isEmpty()) {

            vectorStore.add(batch);

            batch.clear();
        }

        /*
         * Mark indexing as complete.
         */
        markReady(
                repoId,
                filePaths.size(),
                processedFiles,
                successfulFiles,
                failedFiles,
                totalChunks,
                repo.getFullName()
        );
    }

    /**
     * Extracts indexable files from the GitHub repository tree.
     */
    @SuppressWarnings("unchecked")
    private List<String> listIndexableFiles(
            Map<String, Object> tree) {

        if (tree == null || tree.get("tree") == null) {
            return List.of();
        }

        List<Map<String, Object>> entries =
                (List<Map<String, Object>>) tree.get("tree");

        return entries.stream()
                .filter(entry ->
                        "blob".equals(
                                String.valueOf(entry.get("type"))
                        )
                )
                .filter(entry -> {

                    String path =
                            String.valueOf(entry.get("path"));

                    long size =
                            entry.get("size") instanceof Number number
                                    ? number.longValue()
                                    : 0L;

                    return fileFilter.isEligible(
                            path,
                            size,
                            maxFileBytes
                    );
                })
                .map(entry ->
                        String.valueOf(entry.get("path"))
                )
                .toList();
    }

    /**
     * Deletes all existing vectors belonging to this repository.
     *
     * If deletion fails, indexing is stopped to prevent mixing old
     * and new vectors.
     */
    private void deleteExistingVectors(String repoId) {

        var filter = new FilterExpressionBuilder()
                .eq(
                        RagSettings.METADATA_REPO_ID,
                        repoId
                )
                .build();

        try {

            vectorStore.delete(filter);

            log.info(
                    "Deleted existing vectors for repository {}",
                    repoId
            );

        } catch (Exception ex) {

            log.error(
                    "Could not delete existing vectors for repository {}",
                    repoId,
                    ex
            );

            throw new IllegalStateException(
                    "Failed to clear existing repository vectors",
                    ex
            );
        }
    }

    /**
     * Updates indexing progress.
     */
    @Transactional
    protected void updateProgress(
            UUID repoId,
            int total,
            int processed,
            int chunks) {

        repositoryRepository
                .findById(repoId)
                .ifPresent(repo -> {

                    repo.setFilesTotal(total);
                    repo.setFilesProcessed(processed);
                    repo.setChunkCount(chunks);
                    repo.setIndexStatus(IndexStatus.INDEXING);
                    repo.setErrorMessage(null);
                    repo.setUpdatedAt(Instant.now());

                    repositoryRepository.save(repo);
                });
    }

    /**
     * Marks repository indexing as successfully completed.
     */
    @Transactional
    protected void markReady(
            UUID repoId,
            int totalFiles,
            int processedFiles,
            int successfulFiles,
            int failedFiles,
            int totalChunks,
            String fullName) {

        repositoryRepository
                .findById(repoId)
                .ifPresent(repo -> {

                    repo.setIndexStatus(IndexStatus.READY);
                    repo.setFilesTotal(totalFiles);
                    repo.setFilesProcessed(processedFiles);
                    repo.setChunkCount(totalChunks);
                    repo.setIndexedAt(Instant.now());
                    repo.setErrorMessage(null);
                    repo.setUpdatedAt(Instant.now());

                    repositoryRepository.save(repo);
                });

        log.info(
                "Indexed repository {}: {} processed, {} successful, {} failed, {} chunks",
                fullName,
                processedFiles,
                successfulFiles,
                failedFiles,
                totalChunks
        );
    }

    /**
     * Marks repository indexing as failed.
     */
    @Transactional
    protected void markFailed(
            UUID repoId,
            String message) {

        repositoryRepository
                .findById(repoId)
                .ifPresent(repo -> {

                    repo.setIndexStatus(IndexStatus.FAILED);

                    String errorMessage = message;

                    if (errorMessage != null
                            && errorMessage.length() > 2000) {

                        errorMessage =
                                errorMessage.substring(0, 2000);
                    }

                    repo.setErrorMessage(errorMessage);
                    repo.setUpdatedAt(Instant.now());

                    repositoryRepository.save(repo);
                });
    }
}



