// Opens an app through its deep link without leaving the page, and reports whether an app
// seemed to take over. A launched app, or the browser's own "open this app?" prompt, takes
// focus from the page; when nothing does, the caller offers the website.

const APP_WAIT_MS = 1500

export function tryOpenApp(appUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
        let handedOff = false
        const onBlur = () => {
            handedOff = true
        }
        const onHide = () => {
            if (document.hidden) {
                handedOff = true
            }
        }
        window.addEventListener('blur', onBlur)
        document.addEventListener('visibilitychange', onHide)

        // A hidden frame keeps this page in place when no app answers the link.
        const frame = document.createElement('iframe')
        frame.hidden = true
        document.body.append(frame)
        let refused = false
        try {
            frame.contentWindow!.location.href = appUrl
        }
        catch {
            // Firefox throws when nothing is registered for the scheme.
            refused = true
        }

        window.setTimeout(() => {
            window.removeEventListener('blur', onBlur)
            document.removeEventListener('visibilitychange', onHide)
            frame.remove()
            resolve(handedOff && !refused)
        }, refused ? 0 : APP_WAIT_MS)
    })
}
