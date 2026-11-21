import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const SOURCE = join(import.meta.dirname, '..')
const env: Record<string, string> = {}
for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined && !name.startsWith('GIT_'))
        env[name] = value
}

function run(cwd: string, command: string, args: string[], input?: string) {
    return spawnSync(command, args, { cwd, encoding: 'utf8', env, input })
}
function ok(result: ReturnType<typeof run>): string {
    assert.equal(result.status, 0, result.stderr || result.stdout)
    return result.stdout.trim()
}
function denied(result: ReturnType<typeof run>): void {
    assert.notEqual(result.status, 0)
    assert.ok(result.stderr.includes('Git policy:'), result.stderr)
}

function fixture(): {
    root: string
    repo: string
    git: (...args: string[]) => ReturnType<typeof run>
} {
    const root = mkdtempSync(join(tmpdir(), 'starter-git-policy-'))
    const repo = join(root, 'repo')
    mkdirSync(join(repo, 'scripts'), { recursive: true })
    const git = (...args: string[]) => run(repo, 'git', args)
    ok(git('init', '-b', 'main'))
    ok(git('config', 'user.name', 'Git policy fixture'))
    ok(git('config', 'user.email', 'fixture@example.invalid'))
    cpSync(join(SOURCE, 'scripts', 'hooks'), join(repo, 'scripts', 'hooks'), { recursive: true })
    ok(git('add', 'scripts'))
    ok(git('commit', '-m', 'seed'))
    ok(run(repo, 'sh', ['scripts/hooks/install-git-policy']))
    return { root, repo, git }
}

describe('git policy guard', () => {
    it('trunk work stays usable', () => {
        const { root, repo, git } = fixture()
        try {
            ok(git('commit', '--allow-empty', '-m', 'on main'))
            ok(git('tag', 'v0.0.1'))
            ok(git('update-ref', 'refs/remotes/origin/feature', 'HEAD'))
            ok(run(repo, 'sh', ['scripts/hooks/git-policy', 'commit']))
            ok(run(repo, 'sh', ['scripts/hooks/install-git-policy']))
        }
        finally {
            rmSync(root, { recursive: true, force: true })
        }
    })

    it('unrequested branches are refused and an exact grant allows one', () => {
        const { root, repo, git } = fixture()
        try {
            denied(git('switch', '-c', 'feature'))
            denied(git('branch', 'feature'))
            denied(git('update-ref', 'refs/heads/feature', 'HEAD'))
            ok(git('config', '--local', 'starter.authorizedBranch', 'feature'))
            denied(git('switch', '-c', 'other'))
            ok(git('switch', '-c', 'feature'))
            ok(run(repo, 'sh', ['scripts/hooks/git-policy', 'commit']))
            ok(git('config', '--local', '--unset', 'starter.authorizedBranch'))
            denied(run(repo, 'sh', ['scripts/hooks/git-policy', 'commit']))
        }
        finally {
            rmSync(root, { recursive: true, force: true })
        }
    })

    it('worktrees and detached commits are refused without a one-use grant', () => {
        const { root, git } = fixture()
        try {
            const tree = join(root, 'tree')
            denied(git('worktree', 'add', '--detach', tree, 'HEAD'))
            assert.equal(existsSync(tree), false)
            denied(git('worktree', 'add', '-b', 'feature', tree))
            ok(git('config', '--local', 'starter.authorizedDetachedCheckout', 'true'))
            ok(git('worktree', 'add', '--detach', tree, 'HEAD'))
            assert.equal(git('config', '--local', '--get', 'starter.authorizedDetachedCheckout').status, 1)
            denied(run(tree, 'sh', ['scripts/hooks/git-policy', 'commit']))
        }
        finally {
            rmSync(root, { recursive: true, force: true })
        }
    })

    it('pushes go to trunk only and never rewrite it', () => {
        const { root, git } = fixture()
        try {
            const remote = join(root, 'remote.git')
            ok(run(root, 'git', ['init', '--bare', '-b', 'main', remote]))
            ok(git('remote', 'add', 'origin', remote))
            ok(git('push', 'origin', 'HEAD:refs/heads/main'))
            denied(git('push', 'origin', 'HEAD:refs/heads/feature'))
            ok(git('commit', '--allow-empty', '-m', 'second'))
            ok(git('push', 'origin', 'HEAD:refs/heads/main'))
            ok(git('reset', '--hard', 'HEAD~1'))
            ok(git('commit', '--allow-empty', '-m', 'diverged'))
            denied(git('push', '--force', 'origin', 'HEAD:refs/heads/main'))
        }
        finally {
            rmSync(root, { recursive: true, force: true })
        }
    })

    it('an existing Git LFS pre-push hook is wrapped, and other hooks are left alone', () => {
        const { root, repo, git } = fixture()
        try {
            const hook = join(repo, '.git', 'hooks', 'pre-push')
            const stub = join(root, 'bin')
            mkdirSync(stub)
            writeFileSync(join(stub, 'git-lfs'), '#!/bin/sh\ncat >/dev/null\necho "$@" >>"$LFS_LOG"\n', {
                mode: 0o755,
            })
            writeFileSync(hook, '#!/bin/sh\ngit lfs pre-push "$@"\n', { mode: 0o755 })
            ok(run(repo, 'sh', ['scripts/hooks/install-git-policy']))
            const log = join(root, 'lfs.log')
            const withStub = { ...env, PATH: `${stub}:${env.PATH}`, LFS_LOG: log }
            const push = (ref: string) =>
                spawnSync('git', ['push', 'origin', `HEAD:${ref}`], {
                    cwd: repo,
                    encoding: 'utf8',
                    env: withStub,
                })
            const remote = join(root, 'remote.git')
            ok(run(root, 'git', ['init', '--bare', '-b', 'main', remote]))
            ok(git('remote', 'add', 'origin', remote))
            ok(push('refs/heads/main'))
            assert.ok(readFileSync(log, 'utf8').includes('pre-push origin'))
            denied(push('refs/heads/feature'))
            ok(run(repo, 'sh', ['scripts/hooks/install-git-policy']))
            writeFileSync(hook, '#!/bin/sh\nexit 0\n', { mode: 0o755 })
            const refused = run(repo, 'sh', ['scripts/hooks/install-git-policy'])
            assert.notEqual(refused.status, 0)
            assert.equal(readFileSync(hook, 'utf8'), '#!/bin/sh\nexit 0\n')
        }
        finally {
            rmSync(root, { recursive: true, force: true })
        }
    })

    it('a different trunk name can be configured', () => {
        const { root, repo, git } = fixture()
        try {
            ok(git('config', '--local', 'starter.trunkBranch', 'trunk'))
            denied(run(repo, 'sh', ['scripts/hooks/git-policy', 'commit']))
            ok(git('switch', '-c', 'trunk'))
            ok(run(repo, 'sh', ['scripts/hooks/git-policy', 'commit']))
        }
        finally {
            rmSync(root, { recursive: true, force: true })
        }
    })
})
