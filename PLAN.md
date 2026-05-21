# Plano de Correção Total: Paginação A4 SmartTest

Este plano visa resolver permanentemente as discrepâncias de margem, borda e quebra de página no editor, garantindo uma experiência fiel ao papel físico A4 (210x297mm).

## 🎯 Objetivos
1. **Fidelidade Geométrica**: Garantir que 1mm no editor corresponda exatamente ao esperado na impressão.
2. **Sincronia CSS-JS**: Alinhar o fundo repetível do CSS com os widgets de quebra do Javascript.
3. **Eliminação de "Gaps"**: Corrigir o problema de espaços vazios excessivos entre parágrafos e quebras de página.

## 🛠️ Arquitetura Proposta

### 1. Sistema de Medição Único
- Centralizar a conversão MM -> PX em uma única constante exportada.
- Aplicar arredondamento determinístico (`Math.floor` ou `Math.round`) em todos os pontos.

### 2. Refatoração do CSS de Fundo
- O `.exam-page` deve usar um `background-size` que case exatamente com `pageHeight + pageGap`.
- As margens azuis (`show-margin-guides`) devem ser desenhadas em relação ao `padding` real do editor.

### 3. Otimização do PaginationExtension
- Utilizar `offsetTop` para detectar a quebra, mas compensar dinamicamente a altura dos widgets de página anteriores.
- Implementar um "Buffer de Segurança" de 1px para evitar quebras por erro de ponto flutuante.

## 📋 Fases de Implementação

### Fase 1: Auditoria Geométrica (`explorer-agent`)
- Verificar se as variáveis CSS `--page-h` e `--page-pad-*` estão sendo injetadas corretamente no DOM.
- Medir a altura real de um parágrafo padrão vs o que o JS reporta.

### Fase 2: Implementação de Core (`frontend-specialist`)
- Sincronizar `RichEditor.tsx` (estilos dinâmicos) com `PaginationExtension.ts`.
- Ajustar o `index.css` para suportar o novo cálculo de `page-cycle`.

### Fase 3: Validação de Performance (`performance-optimizer`)
- Garantir que o `ResizeObserver` não dispare loops infinitos durante a digitação.

### Fase 4: Testes de Regressão (`test-engineer`)
- Validar em diferentes níveis de Zoom (80%, 100%, 125%).
- Testar documentos com +10 páginas.

## 🧪 Plano de Verificação
- Execução de `lint_runner.py` para garantir integridade.
- Teste manual com régua física (digital) no navegador para validar os 297mm.

---
**Status:** Aguardando aprovação para iniciar Fase 2 (Implementação).
