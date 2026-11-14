// Vite turns an import ending in ?url into the emitted file's address.
declare module '*?url' {
    const url: string
    export default url
}
