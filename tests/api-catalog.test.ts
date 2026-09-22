import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { apiEndpoints } from '../shared/api-catalog'

const projectRoot = new URL('..', import.meta.url).pathname

function v1RouteFiles(dir = 'server/api/v1'): string[] {
  const absolute = join(projectRoot, dir)
  return readdirSync(absolute).flatMap((entry) => {
    const relative = `${dir}/${entry}`
    return statSync(join(projectRoot, relative)).isDirectory() ? v1RouteFiles(relative) : [relative]
  })
}

describe('对外接口清单', () => {
  it('每个接口都有对应的实现文件', () => {
    for (const endpoint of apiEndpoints) {
      expect(
        () => statSync(join(projectRoot, endpoint.routeFile)),
        `${endpoint.method} ${endpoint.path} 找不到实现文件`,
      ).not.toThrow()
    }
  })

  it('server/api/v1 下没有漏登记的接口', () => {
    const documented = new Set(apiEndpoints.map(item => item.routeFile))
    const undocumented = v1RouteFiles().filter(file => !documented.has(file))
    expect(undocumented, `这些接口还没登记到 shared/api-catalog.ts:${undocumented.join(', ')}`).toEqual([])
  })

  it('方法和路径不重复', () => {
    const keys = apiEndpoints.map(item => `${item.method} ${item.path}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('维护接口的实现都要求写权限', () => {
    for (const endpoint of apiEndpoints.filter(item => item.kind === 'write')) {
      const source = readFileSync(join(projectRoot, endpoint.routeFile), 'utf8')
      expect(source, `${endpoint.method} ${endpoint.path} 没有校验写权限`).toContain(
        'requireApiKey(event, { write: true })',
      )
    }
  })

  it('查询接口不要求写权限', () => {
    for (const endpoint of apiEndpoints.filter(item => item.kind === 'read')) {
      const source = readFileSync(join(projectRoot, endpoint.routeFile), 'utf8')
      expect(source, `${endpoint.method} ${endpoint.path} 不应该要求写权限`).not.toContain('write: true')
    }
  })
})
