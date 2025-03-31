<?php

namespace Database\Seeders;

use App\Models\EquipmentType;
use Illuminate\Database\Seeder;

class EquipmentTypeSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Equipamentos Industriais & Máquinas
        EquipmentType::create([
            'name' => 'Bomba centrífuga',
            'description' => 'Equipamento para movimentação de fluidos'
        ]);

        EquipmentType::create([
            'name' => 'Motor Elétrico',
            'description' => 'Motor para conversão de energia elétrica em mecânica'
        ]);

        EquipmentType::create([
            'name' => 'Válvula',
            'description' => 'Dispositivo para controle de fluxo de fluidos'
        ]);

        EquipmentType::create([
            'name' => 'Prensa Industrial',
            'description' => 'Equipamento para conformação e prensagem de materiais'
        ]);

        EquipmentType::create([
            'name' => 'Torno CNC',
            'description' => 'Máquina de usinagem controlada por computador'
        ]);

        EquipmentType::create([
            'name' => 'Torno Vertical CNC',
            'description' => 'Máquina de usinagem controlada por computador'
        ]);

        EquipmentType::create([
            'name' => 'Fresadora',
            'description' => 'Equipamento para usinagem de peças metálicas'
        ]);

        EquipmentType::create([
            'name' => 'Máquina de Corte a Laser',
            'description' => 'Equipamento de precisão para corte de materiais usando laser'
        ]);

        EquipmentType::create([
            'name' => 'Máquina de Corte',
            'description' => 'Equipamento de precisão para corte de materiais usando plasma e/ou oxicorte'
        ]);

        EquipmentType::create([
            'name' => 'Injetora de Plástico',
            'description' => 'Máquina para moldagem de peças plásticas por injeção'
        ]);

        EquipmentType::create([
            'name' => 'Compressor de Ar',
            'description' => 'Equipamento para geração de ar comprimido'
        ]);

        // 2. Veículos & Transporte
        EquipmentType::create([
            'name' => 'Caminhão',
            'description' => 'Veículo pesado para transporte de cargas'
        ]);

        EquipmentType::create([
            'name' => 'Empilhadeira Elétrica',
            'description' => 'Veículo para movimentação de cargas em armazéns'
        ]);

        EquipmentType::create([
            'name' => 'Empilhadeira a Gás',
            'description' => 'Veículo para movimentação de cargas em armazéns'
        ]);

        // 4. Ferramentas & Equipamentos Manuais
        EquipmentType::create([
            'name' => 'Furadeira Radial',
            'description' => 'Ferramenta de usinagem para perfuração'
        ]);

        EquipmentType::create([
            'name' => 'Máquina de Solda',
            'description' => 'Equipamento para soldagem de materiais'
        ]);

        // 5. Equipamentos Elétricos & Energia
        EquipmentType::create([
            'name' => 'Gerador',
            'description' => 'Equipamento para geração de energia elétrica'
        ]);

        EquipmentType::create([
            'name' => 'Transformador',
            'description' => 'Equipamento para conversão de tensão elétrica'
        ]);

        // 6. Infraestrutura & Edificações
        EquipmentType::create([
            'name' => 'Sistema HVAC',
            'description' => 'Sistema de aquecimento, ventilação e ar condicionado'
        ]);

        EquipmentType::create([
            'name' => 'Elevador',
            'description' => 'Equipamento para transporte vertical de pessoas e cargas'
        ]);

        // 7. Equipamentos Médicos & Laboratoriais
        EquipmentType::create([
            'name' => 'Ressonância Magnética',
            'description' => 'Equipamento para diagnóstico por imagem'
        ]);

        EquipmentType::create([
            'name' => 'Autoclave',
            'description' => 'Equipamento para esterilização de materiais'
        ]);

        // 8. Ferramentas & Equipamentos de Construção
        EquipmentType::create([
            'name' => 'Betoneira',
            'description' => 'Equipamento para mistura de concreto'
        ]);

        EquipmentType::create([
            'name' => 'Compactador',
            'description' => 'Equipamento para compactação de solo'
        ]);

        // 9. Equipamentos de Segurança
        EquipmentType::create([
            'name' => 'Sistema de Monitoramento',
            'description' => 'Equipamento para vigilância e segurança'
        ]);

        // 10. Equipamentos de Transporte e Logística
        EquipmentType::create([
            'name' => 'Esteira Transportadora',
            'description' => 'Sistema para transporte contínuo de materiais'
        ]);

        EquipmentType::create([
            'name' => 'Ponte Rolante',
            'description' => 'Equipamento para movimentação aérea de cargas'
        ]);
    }
} 