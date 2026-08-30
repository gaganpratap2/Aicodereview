package devPilot.backend.config;

// Java's Executor interface.
// An Executor is responsible for running tasks, usually on separate threads.
import java.util.concurrent.Executor;

// @Bean tells Spring that a method creates an object
// that should be managed by the Spring container.
import org.springframework.context.annotation.Bean;

// @Configuration tells Spring that this class contains
// configuration and bean definitions.
import org.springframework.context.annotation.Configuration;

// @EnableAsync enables asynchronous method execution in Spring.
// After enabling this, you can use @Async on methods.
import org.springframework.scheduling.annotation.EnableAsync;

// ThreadPoolTaskExecutor is Spring's implementation of an Executor.
// It manages a pool of reusable worker threads.
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

// RestClient is Spring's HTTP client used to communicate
// with external REST APIs.
import org.springframework.web.client.RestClient;


// This annotation tells Spring:
//
// "This class contains configuration for my application."
//
// Spring will detect this class during application startup
// and execute its @Bean methods.
@Configuration

// Enables Spring's asynchronous processing.
//
// After this is enabled, methods annotated with:
//
//     @Async
//
// can execute in a separate thread instead of blocking
// the thread that called the method.
@EnableAsync
public class AppConfig {


    // ============================================================
    // REST CLIENT CONFIGURATION
    // ============================================================

    // @Bean tells Spring:
    //
    // "Create the object returned by this method and store it
    // inside the Spring ApplicationContext."
    //
    // Other classes can then inject RestClient.Builder
    // instead of creating a new builder themselves.
    @Bean
    RestClient.Builder restClientBuilder() {

        // Creates and returns a RestClient.Builder.
        //
        // The builder can later be used to create a RestClient
        // for making HTTP requests to external services.
        //
        // Example:
        //
        // RestClient client = restClientBuilder.build();
        //
        // client.get()
        //       .uri("https://example.com")
        //       .retrieve()
        //       .body(String.class);
        //
        return RestClient.builder();
    }


    // ============================================================
    // ASYNCHRONOUS INDEXING EXECUTOR
    // ============================================================

    // Create another Spring bean.
    //
    // "indexingExecutor" is the name of this bean.
    //
    // Giving the executor a name is useful when the application
    // has multiple executors.
    //
    // For example, another service can write:
    //
    // @Async("indexingExecutor")
    //
    // which means:
    //
    // "Run this method using this particular thread pool."
    @Bean(name = "indexingExecutor")
    Executor indexingExecutor() {


        // Create a Spring ThreadPoolTaskExecutor.
        //
        // A thread pool is a collection of reusable threads
        // that can execute tasks.
        //
        // Instead of creating a brand-new thread for every
        // indexing task, the application can reuse threads
        // from this pool.
        ThreadPoolTaskExecutor executor =
                new ThreadPoolTaskExecutor();


        // --------------------------------------------------------
        // CORE POOL SIZE
        // --------------------------------------------------------

        // Configure the number of core worker threads.
        //
        // Here we are saying:
        //
        // "Keep 2 core threads available for indexing work."
        //
        // Conceptually:
        //
        //     indexingExecutor
        //          |
        //       +--+--+
        //       |     |
        //    thread1 thread2
        //
        executor.setCorePoolSize(2);


        // --------------------------------------------------------
        // MAXIMUM POOL SIZE
        // --------------------------------------------------------

        // Maximum number of threads that this executor
        // is allowed to create.
        //
        // Normal operation:
        //
        //     2 threads
        //
        // If there is heavy work and the queue conditions
        // require additional threads, the pool can grow up to:
        //
        //     4 threads
        //
        // So the maximum is 4 worker threads.
        executor.setMaxPoolSize(4);


        // --------------------------------------------------------
        // QUEUE CAPACITY
        // --------------------------------------------------------

        // Maximum number of tasks that can wait in the queue
        // when worker threads are busy.
        //
        // Imagine all worker threads are currently working:
        //
        //     Thread 1 -> Repository A
        //     Thread 2 -> Repository B
        //
        // If another indexing task arrives:
        //
        //     Repository C
        //
        // it can wait in the queue.
        //
        // This queue can hold up to 50 waiting tasks.
        //
        // Conceptually:
        //
        //     Running threads:
        //     +----------+----------+
        //     | Thread 1 | Thread 2 |
        //     +----------+----------+
        //
        //     Waiting queue:
        //     [Task C]
        //     [Task D]
        //     [Task E]
        //       ...
        //     [up to 50 tasks]
        //
        executor.setQueueCapacity(50);


        // --------------------------------------------------------
        // THREAD NAME PREFIX
        // --------------------------------------------------------

        // Give the worker threads a recognizable name.
        //
        // Threads created by this executor will have names
        // similar to:
        //
        //     index-1
        //     index-2
        //     index-3
        //     index-4
        //
        // This is extremely useful when looking at application
        // logs or debugging thread-related problems.
        //
        // For example:
        //
        //     [index-1] Started indexing repository
        //     [index-2] Processing Java file
        //
        executor.setThreadNamePrefix("index-");


        // --------------------------------------------------------
        // INITIALIZE EXECUTOR
        // --------------------------------------------------------

        // Initializes the ThreadPoolTaskExecutor.
        //
        // This prepares the executor so that it can start
        // accepting and executing tasks.
        executor.initialize();


        // Return the executor to Spring.
        //
        // Spring will store this object in the ApplicationContext
        // with the name:
        //
        //     indexingExecutor
        //
        // Other classes can then use/inject it.
        return executor;
    }
}
