export function isRESTError(error: any): error is {message: string, code: number} {
    return typeof error === "object" && typeof error.message === "string" && typeof error.code === "number";
}