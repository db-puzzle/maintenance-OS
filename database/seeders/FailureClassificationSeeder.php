<?php

namespace Database\Seeders;

use App\Models\WorkOrders\FailureMode;
use App\Models\WorkOrders\RootCause;
use App\Models\WorkOrders\ImmediateCause;
use Illuminate\Database\Seeder;

class FailureClassificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->seedFailureModes();
        $this->seedRootCauses();
        $this->seedImmediateCauses();
    }

    private function seedFailureModes(): void
    {
        $failureModes = [
            // Mechanical
            ['code' => 'FM001', 'name' => 'Desgaste', 'description' => 'Desgaste normal de componentes', 'category' => 'mechanical'],
            ['code' => 'FM002', 'name' => 'Fadiga', 'description' => 'Falha por fadiga do material', 'category' => 'mechanical'],
            ['code' => 'FM003', 'name' => 'Fratura', 'description' => 'Quebra ou fratura de componente', 'category' => 'mechanical'],
            ['code' => 'FM004', 'name' => 'Corrosão', 'description' => 'Deterioração por corrosão', 'category' => 'mechanical'],
            ['code' => 'FM005', 'name' => 'Desalinhamento', 'description' => 'Componentes desalinhados', 'category' => 'mechanical'],
            ['code' => 'FM006', 'name' => 'Vibração Excessiva', 'description' => 'Vibração acima dos limites', 'category' => 'mechanical'],
            ['code' => 'FM007', 'name' => 'Folga Excessiva', 'description' => 'Folga além da tolerância', 'category' => 'mechanical'],
            
            // Electrical
            ['code' => 'FM008', 'name' => 'Curto-circuito', 'description' => 'Falha de isolamento elétrico', 'category' => 'electrical'],
            ['code' => 'FM009', 'name' => 'Circuito Aberto', 'description' => 'Interrupção no circuito elétrico', 'category' => 'electrical'],
            ['code' => 'FM010', 'name' => 'Sobrecarga', 'description' => 'Corrente excessiva', 'category' => 'electrical'],
            ['code' => 'FM011', 'name' => 'Falha de Isolamento', 'description' => 'Degradação do isolamento', 'category' => 'electrical'],
            ['code' => 'FM012', 'name' => 'Mau Contato', 'description' => 'Conexão elétrica deficiente', 'category' => 'electrical'],
            
            // Hydraulic
            ['code' => 'FM013', 'name' => 'Vazamento', 'description' => 'Perda de fluido hidráulico', 'category' => 'hydraulic'],
            ['code' => 'FM014', 'name' => 'Contaminação', 'description' => 'Fluido contaminado', 'category' => 'hydraulic'],
            ['code' => 'FM015', 'name' => 'Cavitação', 'description' => 'Formação de bolhas no fluido', 'category' => 'hydraulic'],
            ['code' => 'FM016', 'name' => 'Pressão Inadequada', 'description' => 'Pressão fora dos parâmetros', 'category' => 'hydraulic'],
            
            // Pneumatic
            ['code' => 'FM017', 'name' => 'Vazamento de Ar', 'description' => 'Perda de ar comprimido', 'category' => 'pneumatic'],
            ['code' => 'FM018', 'name' => 'Umidade no Sistema', 'description' => 'Presença de água no ar', 'category' => 'pneumatic'],
            
            // Thermal
            ['code' => 'FM019', 'name' => 'Superaquecimento', 'description' => 'Temperatura excessiva', 'category' => 'thermal'],
            ['code' => 'FM020', 'name' => 'Refrigeração Insuficiente', 'description' => 'Sistema de arrefecimento inadequado', 'category' => 'thermal'],
        ];

        foreach ($failureModes as $mode) {
            FailureMode::create(array_merge($mode, ['is_active' => true]));
        }
    }

    private function seedRootCauses(): void
    {
        $rootCauses = [
            // Design
            ['code' => 'RC001', 'name' => 'Erro de Projeto', 'description' => 'Falha no projeto original', 'category' => 'design'],
            ['code' => 'RC002', 'name' => 'Subdimensionamento', 'description' => 'Componente subdimensionado', 'category' => 'design'],
            ['code' => 'RC003', 'name' => 'Material Inadequado', 'description' => 'Especificação incorreta de material', 'category' => 'design'],
            
            // Manufacturing
            ['code' => 'RC004', 'name' => 'Defeito de Fabricação', 'description' => 'Erro no processo de fabricação', 'category' => 'manufacturing'],
            ['code' => 'RC005', 'name' => 'Montagem Incorreta', 'description' => 'Erro durante a montagem', 'category' => 'manufacturing'],
            ['code' => 'RC006', 'name' => 'Qualidade do Material', 'description' => 'Material fora de especificação', 'category' => 'manufacturing'],
            
            // Operation
            ['code' => 'RC007', 'name' => 'Operação Inadequada', 'description' => 'Uso incorreto do equipamento', 'category' => 'operation'],
            ['code' => 'RC008', 'name' => 'Sobrecarga Operacional', 'description' => 'Operação além da capacidade', 'category' => 'operation'],
            ['code' => 'RC009', 'name' => 'Falta de Treinamento', 'description' => 'Operador sem qualificação adequada', 'category' => 'operation'],
            
            // Maintenance
            ['code' => 'RC010', 'name' => 'Falta de Manutenção', 'description' => 'Manutenção não realizada', 'category' => 'maintenance'],
            ['code' => 'RC011', 'name' => 'Manutenção Inadequada', 'description' => 'Manutenção incorreta', 'category' => 'maintenance'],
            ['code' => 'RC012', 'name' => 'Intervalo Inadequado', 'description' => 'Frequência de manutenção incorreta', 'category' => 'maintenance'],
            ['code' => 'RC013', 'name' => 'Peça de Reposição Inadequada', 'description' => 'Uso de peça não especificada', 'category' => 'maintenance'],
            
            // Environment
            ['code' => 'RC014', 'name' => 'Condições Ambientais', 'description' => 'Ambiente agressivo', 'category' => 'environment'],
            ['code' => 'RC015', 'name' => 'Temperatura Extrema', 'description' => 'Temperatura fora dos limites', 'category' => 'environment'],
            ['code' => 'RC016', 'name' => 'Umidade Excessiva', 'description' => 'Alta umidade ambiente', 'category' => 'environment'],
            ['code' => 'RC017', 'name' => 'Contaminação Externa', 'description' => 'Presença de contaminantes', 'category' => 'environment'],
            
            // Management
            ['code' => 'RC018', 'name' => 'Falta de Procedimento', 'description' => 'Ausência de procedimento adequado', 'category' => 'management'],
            ['code' => 'RC019', 'name' => 'Comunicação Deficiente', 'description' => 'Falha na comunicação', 'category' => 'management'],
            ['code' => 'RC020', 'name' => 'Recursos Inadequados', 'description' => 'Falta de recursos necessários', 'category' => 'management'],
        ];

        foreach ($rootCauses as $cause) {
            RootCause::create(array_merge($cause, ['is_active' => true]));
        }
    }

    private function seedImmediateCauses(): void
    {
        $immediateCauses = [
            // Human Error
            ['code' => 'IC001', 'name' => 'Erro de Operação', 'description' => 'Comando incorreto do operador', 'category' => 'human'],
            ['code' => 'IC002', 'name' => 'Negligência', 'description' => 'Descuido ou falta de atenção', 'category' => 'human'],
            ['code' => 'IC003', 'name' => 'Procedimento não Seguido', 'description' => 'Não seguiu instruções', 'category' => 'human'],
            ['code' => 'IC004', 'name' => 'Falta de Experiência', 'description' => 'Operador inexperiente', 'category' => 'human'],
            
            // Equipment
            ['code' => 'IC005', 'name' => 'Fim de Vida Útil', 'description' => 'Componente no fim da vida', 'category' => 'equipment'],
            ['code' => 'IC006', 'name' => 'Defeito Súbito', 'description' => 'Falha repentina', 'category' => 'equipment'],
            ['code' => 'IC007', 'name' => 'Degradação Gradual', 'description' => 'Deterioração ao longo do tempo', 'category' => 'equipment'],
            
            // Process
            ['code' => 'IC008', 'name' => 'Condição Anormal', 'description' => 'Processo fora de controle', 'category' => 'process'],
            ['code' => 'IC009', 'name' => 'Partida Incorreta', 'description' => 'Erro na partida do equipamento', 'category' => 'process'],
            ['code' => 'IC010', 'name' => 'Parada Incorreta', 'description' => 'Erro na parada do equipamento', 'category' => 'process'],
            
            // External
            ['code' => 'IC011', 'name' => 'Falta de Energia', 'description' => 'Interrupção no fornecimento', 'category' => 'external'],
            ['code' => 'IC012', 'name' => 'Variação de Tensão', 'description' => 'Oscilação na rede elétrica', 'category' => 'external'],
            ['code' => 'IC013', 'name' => 'Impacto Externo', 'description' => 'Dano por agente externo', 'category' => 'external'],
            ['code' => 'IC014', 'name' => 'Vandalismo', 'description' => 'Dano intencional', 'category' => 'external'],
            
            // Material
            ['code' => 'IC015', 'name' => 'Lubrificante Inadequado', 'description' => 'Tipo ou quantidade incorreta', 'category' => 'material'],
            ['code' => 'IC016', 'name' => 'Combustível Contaminado', 'description' => 'Qualidade inadequada', 'category' => 'material'],
            ['code' => 'IC017', 'name' => 'Filtro Saturado', 'description' => 'Filtro obstruído', 'category' => 'material'],
        ];

        foreach ($immediateCauses as $cause) {
            ImmediateCause::create(array_merge($cause, ['is_active' => true]));
        }
    }
} 