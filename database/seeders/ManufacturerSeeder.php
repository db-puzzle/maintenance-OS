<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AssetHierarchy\Manufacturer;

class ManufacturerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $manufacturers = [
            [
                'name' => 'John Crane',
                'website' => 'https://www.johncrane.com',
                'email' => 'contact@johncrane.com',
                'phone' => '+1-847-967-2400',
                'country' => 'Estados Unidos',
                'notes' => 'Líder mundial em selos mecânicos e sistemas de vedação',
            ],
            [
                'name' => 'Parker',
                'website' => 'https://www.parker.com',
                'email' => 'contact@parker.com',
                'phone' => '+1-216-896-3000',
                'country' => 'Estados Unidos',
                'notes' => 'Fornecedor global de tecnologias de movimento e controle',
            ],
            [
                'name' => 'SKF',
                'website' => 'https://www.skf.com',
                'email' => 'info@skf.com',
                'phone' => '+46-31-337-1000',
                'country' => 'Suécia',
                'notes' => 'Líder mundial em rolamentos, vedações e sistemas de lubrificação',
            ],
            [
                'name' => 'Shell',
                'website' => 'https://www.shell.com',
                'email' => 'contact@shell.com',
                'phone' => '+31-70-377-9111',
                'country' => 'Países Baixos',
                'notes' => 'Empresa global de energia e lubrificantes industriais',
            ],
            [
                'name' => 'Mann Filter',
                'website' => 'https://www.mann-filter.com',
                'email' => 'info@mann-hummel.com',
                'phone' => '+49-7141-98-0',
                'country' => 'Alemanha',
                'notes' => 'Especialista em filtração para aplicações industriais e automotivas',
            ],
            [
                'name' => 'Gates',
                'website' => 'https://www.gates.com',
                'email' => 'contact@gates.com',
                'phone' => '+1-303-744-1911',
                'country' => 'Estados Unidos',
                'notes' => 'Fabricante líder de correias industriais e sistemas de transmissão',
            ],
            [
                'name' => 'Teadit',
                'website' => 'https://www.teadit.com',
                'email' => 'info@teadit.com',
                'phone' => '+55-21-2132-2300',
                'country' => 'Brasil',
                'notes' => 'Especialista em juntas e vedações industriais',
            ],
            [
                'name' => 'WEG',
                'website' => 'https://www.weg.net',
                'email' => 'info@weg.net',
                'phone' => '+55-47-3276-4000',
                'country' => 'Brasil',
                'notes' => 'Líder em motores elétricos e equipamentos de automação industrial',
            ],
            [
                'name' => 'Vedações Brasil',
                'website' => 'https://www.vedacoesbrasil.com.br',
                'email' => 'contato@vedacoesbrasil.com.br',
                'phone' => '+55-11-4444-5555',
                'country' => 'Brasil',
                'notes' => 'Distribuidor nacional de vedações e componentes industriais',
            ],
            [
                'name' => 'SKF Brasil',
                'website' => 'https://www.skf.com/br',
                'email' => 'info.brasil@skf.com',
                'phone' => '+55-11-4066-6600',
                'country' => 'Brasil',
                'notes' => 'Filial brasileira da SKF, especializada em rolamentos e serviços',
            ],
            [
                'name' => 'Shell Brasil',
                'website' => 'https://www.shell.com.br',
                'email' => 'faleconosco@shell.com',
                'phone' => '+55-11-3371-2000',
                'country' => 'Brasil',
                'notes' => 'Subsidiária brasileira da Shell, fornecendo lubrificantes industriais',
            ],
            [
                'name' => 'Filtros Industriais',
                'website' => 'https://www.filtrosindustriais.com.br',
                'email' => 'vendas@filtrosindustriais.com.br',
                'phone' => '+55-11-5555-6666',
                'country' => 'Brasil',
                'notes' => 'Distribuidor de filtros industriais e componentes de filtragem',
            ],
            [
                'name' => 'Gates Brasil',
                'website' => 'https://www.gates.com/br',
                'email' => 'vendas.brasil@gates.com',
                'phone' => '+55-11-4613-7900',
                'country' => 'Brasil',
                'notes' => 'Filial brasileira da Gates Corporation',
            ],
        ];

        foreach ($manufacturers as $manufacturer) {
            Manufacturer::create($manufacturer);
        }
    }
} 