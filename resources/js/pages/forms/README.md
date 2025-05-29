# Componentes de Formulários Generalizados

Este diretório contém componentes generalizados para criar e visualizar formulários que podem ser reutilizados em diferentes contextos como rotinas, inspeções, relatórios, etc.

## Componentes Principais

### FormEditor

Componente para editar/criar formulários com drag-and-drop de tarefas.

**Props:**

- `form?: FormData` - Dados do formulário existente (opcional para novos formulários)
- `entity: EntityData` - Dados da entidade (rotina/inspeção/relatório)
- `entityType: 'routine' | 'inspection' | 'report'` - Tipo da entidade
- `breadcrumbs?: BreadcrumbItem[]` - Breadcrumbs personalizados
- `backRoute?: string` - Rota de volta
- `saveRoute?: string` - Rota para salvar o formulário
- `title?: string` - Título personalizado
- `subtitle?: string` - Subtítulo personalizado

### FormViewer

Componente para visualizar e preencher formulários.

**Props:**

- `form: FormData` - Dados do formulário
- `entity: EntityData` - Dados da entidade
- `entityType: 'routine' | 'inspection' | 'report'` - Tipo da entidade
- `mode?: 'view' | 'fill'` - Modo de visualização ou preenchimento
- `breadcrumbs?: BreadcrumbItem[]` - Breadcrumbs personalizados
- `backRoute?: string` - Rota de volta
- `submitRoute?: string` - Rota para submeter respostas

## Como Usar

### 1. Para Rotinas

```tsx
import FormEditor from '@/pages/forms/form-editor';
import FormViewer from '@/pages/forms/form-viewer';

// Editor
<FormEditor
    form={routine.form}
    entity={{ id: routine.id, name: routine.name }}
    entityType="routine"
    saveRoute={route('routines.forms.store', { routine: routine.id })}
/>

// Visualizador
<FormViewer
    form={routine.form}
    entity={{ id: asset.id, tag: asset.tag }}
    entityType="routine"
    mode="fill"
    submitRoute={route('routines.executions.store', { routine: routine.id })}
/>
```

### 2. Para Inspeções

```tsx
<FormEditor
    form={inspection.form}
    entity={{ id: inspection.id, name: inspection.name }}
    entityType="inspection"
    saveRoute={route('inspections.forms.store', { inspection: inspection.id })}
/>

<FormViewer
    form={inspection.form}
    entity={{ id: asset.id, tag: asset.tag }}
    entityType="inspection"
    mode="fill"
    submitRoute={route('inspections.executions.store', { inspection: inspection.id })}
/>
```

### 3. Para Relatórios

```tsx
<FormEditor
    form={report.form}
    entity={{ id: report.id, name: report.name }}
    entityType="report"
    saveRoute={route('reports.forms.store', { report: report.id })}
/>

<FormViewer
    form={report.form}
    entity={{ id: asset.id, tag: asset.tag }}
    entityType="report"
    mode="fill"
    submitRoute={route('reports.executions.store', { report: report.id })}
/>
```

## Wrappers Específicos

Para manter compatibilidade, você pode criar wrappers específicos:

```tsx
// routine-form-wrapper.tsx
export function RoutineFormEditor({ routine, asset }) {
    return (
        <FormEditor
            form={routine.form}
            entity={{ id: routine.id, name: routine.name }}
            entityType="routine"
            // ... outras props específicas
        />
    );
}
```

## Tipos de Interface

```tsx
interface FormData {
    id?: number;
    name: string;
    tasks?: Task[];
}

interface EntityData {
    id: number;
    name?: string;
    tag?: string;
}
```

## Funcionalidades

- ✅ Drag-and-drop para reordenar tarefas
- ✅ Suporte a diferentes tipos de tarefas (medição, múltipla escolha, foto, etc.)
- ✅ Validação de campos obrigatórios
- ✅ Upload de arquivos
- ✅ Interface adaptável para diferentes tipos de entidade
- ✅ Breadcrumbs personalizáveis
- ✅ Integração com layouts existentes

## Migração

Para migrar componentes específicos existentes:

1. Substitua imports pelos componentes generalizados
2. Ajuste as props conforme necessário
3. Mantenha wrappers para compatibilidade se necessário
4. Teste funcionalidades específicas

## Exemplos Completos

Veja os arquivos de exemplo:

- `inspections/inspection-form-example.tsx`
- `reports/report-form-example.tsx`
- `routines/routine-form-wrapper.tsx`
