import { hasWindow } from 'std-env'

export function getSiteHost() {
    if (!hasWindow && window?.location?.href?.length > 2) {
        return window.location.href
    }

    return undefined
}
