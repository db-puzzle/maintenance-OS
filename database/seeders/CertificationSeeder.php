<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Certification;

class CertificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $certifications = [
            // Safety Certifications
            [
                'name' => 'NR-10 Segurança em Instalações Elétricas',
                'description' => 'Certificação obrigatória para trabalhos com eletricidade',
                'issuing_organization' => 'MTE - Ministério do Trabalho',
                'validity_period_days' => 730, // 2 years
                'active' => true,
            ],
            [
                'name' => 'NR-12 Segurança em Máquinas',
                'description' => 'Certificação para operação segura de máquinas e equipamentos',
                'issuing_organization' => 'MTE - Ministério do Trabalho',
                'validity_period_days' => 730, // 2 years
                'active' => true,
            ],
            [
                'name' => 'NR-13 Caldeiras e Vasos de Pressão',
                'description' => 'Certificação para operação de caldeiras e vasos de pressão',
                'issuing_organization' => 'MTE - Ministério do Trabalho',
                'validity_period_days' => 1095, // 3 years
                'active' => true,
            ],
            [
                'name' => 'NR-33 Espaço Confinado',
                'description' => 'Certificação para trabalho em espaços confinados',
                'issuing_organization' => 'MTE - Ministério do Trabalho',
                'validity_period_days' => 365, // 1 year
                'active' => true,
            ],
            [
                'name' => 'NR-35 Trabalho em Altura',
                'description' => 'Certificação para trabalho em altura acima de 2 metros',
                'issuing_organization' => 'MTE - Ministério do Trabalho',
                'validity_period_days' => 730, // 2 years
                'active' => true,
            ],
            
            // Technical Certifications
            [
                'name' => 'Operador de Empilhadeira',
                'description' => 'Certificação para operação de empilhadeiras',
                'issuing_organization' => 'SENAI',
                'validity_period_days' => 1825, // 5 years
                'active' => true,
            ],
            [
                'name' => 'Operador de Ponte Rolante',
                'description' => 'Certificação para operação de ponte rolante',
                'issuing_organization' => 'SENAI',
                'validity_period_days' => 1825, // 5 years
                'active' => true,
            ],
            [
                'name' => 'Soldador Qualificado - TIG',
                'description' => 'Qualificação em soldagem TIG conforme ASME IX',
                'issuing_organization' => 'FBTS - Fundação Brasileira de Tecnologia da Soldagem',
                'validity_period_days' => 730, // 2 years
                'active' => true,
            ],
            [
                'name' => 'Soldador Qualificado - MIG/MAG',
                'description' => 'Qualificação em soldagem MIG/MAG conforme ASME IX',
                'issuing_organization' => 'FBTS - Fundação Brasileira de Tecnologia da Soldagem',
                'validity_period_days' => 730, // 2 years
                'active' => true,
            ],
            [
                'name' => 'Análise de Vibração Nível I',
                'description' => 'Certificação em análise de vibração conforme ISO 18436-2',
                'issuing_organization' => 'ABRAMAN',
                'validity_period_days' => 1460, // 4 years
                'active' => true,
            ],
            [
                'name' => 'Análise de Vibração Nível II',
                'description' => 'Certificação avançada em análise de vibração conforme ISO 18436-2',
                'issuing_organization' => 'ABRAMAN',
                'validity_period_days' => 1460, // 4 years
                'active' => true,
            ],
            [
                'name' => 'Termografia Nível I',
                'description' => 'Certificação em termografia industrial',
                'issuing_organization' => 'ABRAMAN',
                'validity_period_days' => 1460, // 4 years
                'active' => true,
            ],
            [
                'name' => 'Alinhamento de Máquinas',
                'description' => 'Certificação em alinhamento de máquinas rotativas',
                'issuing_organization' => 'ABRAMAN',
                'validity_period_days' => 1095, // 3 years
                'active' => true,
            ],
            
            // Electrical Certifications
            [
                'name' => 'SEP - Sistema Elétrico de Potência',
                'description' => 'Certificação complementar à NR-10 para alta tensão',
                'issuing_organization' => 'MTE - Ministério do Trabalho',
                'validity_period_days' => 730, // 2 years
                'active' => true,
            ],
            [
                'name' => 'Comandos Elétricos',
                'description' => 'Certificação em montagem e manutenção de comandos elétricos',
                'issuing_organization' => 'SENAI',
                'validity_period_days' => 1095, // 3 years
                'active' => true,
            ],
            
            // Instrumentation Certifications
            [
                'name' => 'Instrumentação Industrial',
                'description' => 'Certificação em instrumentação e controle de processos',
                'issuing_organization' => 'ISA - International Society of Automation',
                'validity_period_days' => 1095, // 3 years
                'active' => true,
            ],
            [
                'name' => 'Calibração de Instrumentos',
                'description' => 'Certificação em calibração de instrumentos de medição',
                'issuing_organization' => 'INMETRO',
                'validity_period_days' => 730, // 2 years
                'active' => true,
            ],
            
            // Environmental and Quality
            [
                'name' => 'ISO 9001 - Auditor Interno',
                'description' => 'Certificação para auditor interno de qualidade',
                'issuing_organization' => 'Bureau Veritas',
                'validity_period_days' => 1095, // 3 years
                'active' => true,
            ],
            [
                'name' => 'ISO 14001 - Gestão Ambiental',
                'description' => 'Certificação em gestão ambiental',
                'issuing_organization' => 'Bureau Veritas',
                'validity_period_days' => 1095, // 3 years
                'active' => true,
            ],
            [
                'name' => 'ISO 45001 - Saúde e Segurança',
                'description' => 'Certificação em gestão de saúde e segurança ocupacional',
                'issuing_organization' => 'Bureau Veritas',
                'validity_period_days' => 1095, // 3 years
                'active' => true,
            ],
        ];

        foreach ($certifications as $certification) {
            Certification::create($certification);
        }
    }
}
