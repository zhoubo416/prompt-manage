import { describe, expect, it } from 'vitest'
import { extractVariableNames, mergeVariables, renderTemplate } from '../shared/template'

describe('extractVariableNames', () => {
  it('按出现顺序提取变量并去重', () => {
    const content = '{{customer_info}} 和 {{ tone }} 还有 {{customer_info}}'
    expect(extractVariableNames(content)).toEqual(['customer_info', 'tone'])
  })

  it('忽略不合法的变量名', () => {
    expect(extractVariableNames('{{ }} {{1abc}} {{good_name}}')).toEqual(['good_name'])
  })
})

describe('mergeVariables', () => {
  it('保留用户补充的必填和说明,正文里没有的变量丢弃', () => {
    const merged = mergeVariables('你好 {{name}},{{gone}}', [
      { name: 'name', required: false, description: '称呼' },
      { name: 'gone', required: true, description: '应该被丢弃' },
    ])
    expect(merged).toEqual([
      { name: 'name', type: 'text', required: false, description: '称呼' },
      { name: 'gone', type: 'text', required: true, description: '应该被丢弃' },
    ])
    expect(mergeVariables('你好 {{name}}', merged)).toEqual([
      { name: 'name', type: 'text', required: false, description: '称呼' },
    ])
  })

  it('没有提供的变量用默认值', () => {
    expect(mergeVariables('{{a}}')).toEqual([
      { name: 'a', type: 'text', required: true, description: '' },
    ])
  })
})

describe('renderTemplate', () => {
  it('替换有样例值的变量,其余保持原样', () => {
    const content = '分析 {{customer_info}},语气 {{tone}}'
    expect(renderTemplate(content, { customer_info: '某制造企业' }))
      .toBe('分析 某制造企业,语气 {{tone}}')
  })
})
