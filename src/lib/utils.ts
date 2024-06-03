export function getSiteHost() {
    const hasWindow = typeof window !== 'undefined'

    if (!hasWindow && window?.location?.href?.length > 2) {
        return window.location.href
    }

    return 'http://localhost:3000'
}
