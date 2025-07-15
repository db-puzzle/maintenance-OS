<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Skill;

class SkillSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $skills = [
            // Mechanical Skills
            [
                'name' => 'Manutenção de Bombas',
                'description' => 'Habilidade para manutenção preventiva e corretiva de bombas centrífugas e de deslocamento positivo',
                'category' => 'Mecânica',
                'active' => true,
            ],
            [
                'name' => 'Alinhamento de Equipamentos',
                'description' => 'Habilidade para realizar alinhamento de eixos usando relógio comparador e laser',
                'category' => 'Mecânica',
                'active' => true,
            ],
            [
                'name' => 'Análise de Vibração',
                'description' => 'Habilidade para coletar e interpretar dados de vibração em equipamentos rotativos',
                'category' => 'Mecânica',
                'active' => true,
            ],
            [
                'name' => 'Manutenção de Redutores',
                'description' => 'Habilidade para manutenção de caixas de engrenagens e redutores',
                'category' => 'Mecânica',
                'active' => true,
            ],
            [
                'name' => 'Manutenção de Compressores',
                'description' => 'Habilidade para manutenção de compressores de ar e gases',
                'category' => 'Mecânica',
                'active' => true,
            ],
            
            // Electrical Skills
            [
                'name' => 'Manutenção de Motores Elétricos',
                'description' => 'Habilidade para manutenção preventiva e corretiva de motores elétricos',
                'category' => 'Elétrica',
                'active' => true,
            ],
            [
                'name' => 'Leitura de Diagramas Elétricos',
                'description' => 'Habilidade para interpretar diagramas elétricos e esquemas de comando',
                'category' => 'Elétrica',
                'active' => true,
            ],
            [
                'name' => 'Manutenção de Painéis Elétricos',
                'description' => 'Habilidade para manutenção de CCMs e painéis de distribuição',
                'category' => 'Elétrica',
                'active' => true,
            ],
            [
                'name' => 'Termografia',
                'description' => 'Habilidade para realizar inspeções termográficas',
                'category' => 'Elétrica',
                'active' => true,
            ],
            
            // Instrumentation Skills
            [
                'name' => 'Calibração de Instrumentos',
                'description' => 'Habilidade para calibrar transmissores de pressão, temperatura e vazão',
                'category' => 'Instrumentação',
                'active' => true,
            ],
            [
                'name' => 'Manutenção de Válvulas de Controle',
                'description' => 'Habilidade para manutenção e ajuste de válvulas de controle',
                'category' => 'Instrumentação',
                'active' => true,
            ],
            [
                'name' => 'Programação de CLPs',
                'description' => 'Habilidade para programar e fazer manutenção em CLPs',
                'category' => 'Automação',
                'active' => true,
            ],
            
            // Welding Skills
            [
                'name' => 'Soldagem TIG',
                'description' => 'Habilidade para realizar soldagem TIG em aço inox e carbono',
                'category' => 'Soldagem',
                'active' => true,
            ],
            [
                'name' => 'Soldagem MIG/MAG',
                'description' => 'Habilidade para realizar soldagem MIG/MAG',
                'category' => 'Soldagem',
                'active' => true,
            ],
            [
                'name' => 'Soldagem Eletrodo Revestido',
                'description' => 'Habilidade para realizar soldagem com eletrodo revestido',
                'category' => 'Soldagem',
                'active' => true,
            ],
            
            // General Skills
            [
                'name' => 'Operação de Empilhadeira',
                'description' => 'Habilidade para operar empilhadeira com segurança',
                'category' => 'Geral',
                'active' => true,
            ],
            [
                'name' => 'Trabalho em Altura',
                'description' => 'Habilidade e certificação para trabalho em altura',
                'category' => 'Segurança',
                'active' => true,
            ],
            [
                'name' => 'Espaço Confinado',
                'description' => 'Habilidade e certificação para trabalho em espaço confinado',
                'category' => 'Segurança',
                'active' => true,
            ],
            [
                'name' => 'Operação de Ponte Rolante',
                'description' => 'Habilidade para operar ponte rolante',
                'category' => 'Geral',
                'active' => true,
            ],
            [
                'name' => 'Hidráulica Industrial',
                'description' => 'Conhecimento em sistemas hidráulicos industriais',
                'category' => 'Mecânica',
                'active' => true,
            ],
            [
                'name' => 'Pneumática Industrial',
                'description' => 'Conhecimento em sistemas pneumáticos industriais',
                'category' => 'Mecânica',
                'active' => true,
            ],
        ];

        foreach ($skills as $skill) {
            Skill::create($skill);
        }
    }
}
