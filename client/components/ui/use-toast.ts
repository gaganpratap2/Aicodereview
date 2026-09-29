"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
}

type ActionType =
  | "ADD_TOAST"
  | "UPDATE_TOAST"
  | "DISMISS_TOAST"
  | "REMOVE_TOAST"

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Action =
  | {
      type: Extract<ActionType, "ADD_TOAST">
      toast: ToasterToast
    }
  | {
      type: Extract<ActionType, "UPDATE_TOAST">
      toast: Partial<ToasterToast>
    }
  | {
      type: Extract<ActionType, "DISMISS_TOAST">
      toastId?: ToasterToast["id"]
    }
  | {
      type: Extract<ActionType, "REMOVE_TOAST">
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

type ToastType = "default" | "loading" | "success" | "error"

type ToastMessage =
  | string
  | {
      title?: string
      description?: string
      action?: ToastActionElement
      type?: ToastType
    }

type ToastPromiseOptions<T> = {
  loading?: ToastMessage
  success?: ToastMessage | ((data: T) => ToastMessage)
  error?: ToastMessage | ((error: unknown) => ToastMessage)
}

function resolveMessage<T>(
  message: ToastMessage | ((value: T) => ToastMessage),
  value: T
): ToastMessage {
  return typeof message === "function" ? message(value) : message
}

function dismissToast(toastId: string) {
  dispatch({ type: "DISMISS_TOAST", toastId })
}

function toVariant(type?: ToastType): "default" | "destructive" {
  return type === "error" ? "destructive" : "default"
}

function toProps(message: ToastMessage): {
  title?: string
  description?: string
  action?: ToastActionElement
  variant: "default" | "destructive"
} {
  if (typeof message === "string") {
    return { title: message, variant: toVariant(undefined) }
  }
  const { type, ...rest } = message
  return { ...rest, variant: toVariant(type) }
}

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function toastAdd(message: ToastMessage) {
  toast(toProps(message))
}

function toastPromise<T>(
  promise: Promise<T>,
  options: ToastPromiseOptions<T> = {}
): Promise<T> {
  const id = genId()

  if (options.loading) {
    const { variant, ...rest } = toProps(options.loading)
    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...rest,
        id,
        variant,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismissToast(id)
        },
      },
    })
  }

  promise
    .then((data) => {
      const message = options.success
        ? resolveMessage(options.success, data)
        : null
      if (!message) {
        dispatch({ type: "DISMISS_TOAST", toastId: id })
        return
      }
      const { variant, ...rest } = toProps(message)
      dispatch({
        type: "UPDATE_TOAST",
        toast: {
          ...rest,
          id,
          variant,
          open: true,
          onOpenChange: (open) => {
            if (!open) dismissToast(id)
          },
        },
      })
    })
    .catch((error: unknown) => {
      const message = options.error ? resolveMessage(options.error, error) : null
      if (!message) {
        dispatch({ type: "DISMISS_TOAST", toastId: id })
        return
      }
      const { variant, ...rest } = toProps(message)
      dispatch({
        type: "UPDATE_TOAST",
        toast: {
          ...rest,
          id,
          variant,
          open: true,
          onOpenChange: (open) => {
            if (!open) dismissToast(id)
          },
        },
      })
    })

  return promise
}

const toastApi = Object.assign(toast, { add: toastAdd, promise: toastPromise })

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toastApi as toast }
