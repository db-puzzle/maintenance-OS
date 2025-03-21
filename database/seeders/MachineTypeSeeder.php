<?php

namespace Database\Seeders;

use App\Models\MachineType;
use Illuminate\Database\Seeder;

class MachineTypeSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Equipamentos Industriais & Máquinas
        MachineType::create([
            'name' => 'Escavadeira',
            'description' => 'Máquina pesada para escavação e movimentação de terra'
        ]);

        MachineType::create([
            'name' => 'Carregadeira',
            'description' => 'Equipamento para carregamento e transporte de materiais'
        ]);

        MachineType::create([
            'name' => 'Motoniveladora',
            'description' => 'Máquina para nivelamento e acabamento de terrenos'
        ]);

        MachineType::create([
            'name' => 'Grua',
            'description' => 'Equipamento para elevação e movimentação de cargas pesadas'
        ]);

        MachineType::create([
            'name' => 'Prensa Industrial',
            'description' => 'Equipamento para conformação e prensagem de materiais'
        ]);

        MachineType::create([
            'name' => 'Torno CNC',
            'description' => 'Máquina de usinagem controlada por computador'
        ]);

        MachineType::create([
            'name' => 'Fresadora',
            'description' => 'Equipamento para usinagem de peças metálicas'
        ]);

        MachineType::create([
            'name' => 'Máquina de Corte a Laser',
            'description' => 'Equipamento de precisão para corte de materiais usando laser'
        ]);

        MachineType::create([
            'name' => 'Injetora de Plástico',
            'description' => 'Máquina para moldagem de peças plásticas por injeção'
        ]);

        MachineType::create([
            'name' => 'Compressor de Ar',
            'description' => 'Equipamento para geração de ar comprimido'
        ]);

        // 2. Veículos & Transporte
        MachineType::create([
            'name' => 'Caminhão',
            'description' => 'Veículo pesado para transporte de cargas'
        ]);

        MachineType::create([
            'name' => 'Empilhadeira',
            'description' => 'Veículo para movimentação de cargas em armazéns'
        ]);

        MachineType::create([
            'name' => 'Locomotiva',
            'description' => 'Veículo ferroviário para tração de vagões'
        ]);

        MachineType::create([
            'name' => 'Trator Agrícola',
            'description' => 'Veículo especializado para trabalhos agrícolas'
        ]);

        // 3. Equipamentos de TI & Escritório
        MachineType::create([
            'name' => 'Servidor',
            'description' => 'Equipamento para processamento e armazenamento de dados'
        ]);

        MachineType::create([
            'name' => 'Switch de Rede',
            'description' => 'Equipamento para conexão de redes de computadores'
        ]);

        // 4. Ferramentas & Equipamentos Manuais
        MachineType::create([
            'name' => 'Furadeira Industrial',
            'description' => 'Ferramenta elétrica para perfuração'
        ]);

        MachineType::create([
            'name' => 'Máquina de Solda',
            'description' => 'Equipamento para soldagem de materiais'
        ]);

        // 5. Equipamentos Elétricos & Energia
        MachineType::create([
            'name' => 'Gerador',
            'description' => 'Equipamento para geração de energia elétrica'
        ]);

        MachineType::create([
            'name' => 'Transformador',
            'description' => 'Equipamento para conversão de tensão elétrica'
        ]);

        // 6. Infraestrutura & Edificações
        MachineType::create([
            'name' => 'Sistema HVAC',
            'description' => 'Sistema de aquecimento, ventilação e ar condicionado'
        ]);

        MachineType::create([
            'name' => 'Elevador',
            'description' => 'Equipamento para transporte vertical de pessoas e cargas'
        ]);

        // 7. Equipamentos Médicos & Laboratoriais
        MachineType::create([
            'name' => 'Ressonância Magnética',
            'description' => 'Equipamento para diagnóstico por imagem'
        ]);

        MachineType::create([
            'name' => 'Autoclave',
            'description' => 'Equipamento para esterilização de materiais'
        ]);

        // 8. Ferramentas & Equipamentos de Construção
        MachineType::create([
            'name' => 'Betoneira',
            'description' => 'Equipamento para mistura de concreto'
        ]);

        MachineType::create([
            'name' => 'Compactador',
            'description' => 'Equipamento para compactação de solo'
        ]);

        // 9. Equipamentos de Segurança
        MachineType::create([
            'name' => 'Sistema de Monitoramento',
            'description' => 'Equipamento para vigilância e segurança'
        ]);

        // 10. Equipamentos de Transporte e Logística
        MachineType::create([
            'name' => 'Esteira Transportadora',
            'description' => 'Sistema para transporte contínuo de materiais'
        ]);

        MachineType::create([
            'name' => 'Ponte Rolante',
            'description' => 'Equipamento para movimentação aérea de cargas'
        ]);
    }
} 