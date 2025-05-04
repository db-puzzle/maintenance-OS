export type UnitCategory = 
    | 'Comprimento'
    | 'Área'
    | 'Volume'
    | 'Massa'
    | 'Tempo'
    | 'Temperatura'
    | 'Pressão'
    | 'Energia'
    | 'Potência'
    | 'Velocidade'
    | 'Aceleração'
    | 'Força'
    | 'Densidade'
    | 'Corrente Elétrica'
    | 'Tensão'
    | 'Resistência Elétrica'
    | 'Condutância Elétrica'
    | 'Capacitância'
    | 'Indutância'
    | 'Frequência'
    | 'Ângulo'
    | 'Luminância'
    | 'Fluxo Luminoso'
    | 'Iluminância'
    | 'Som'
    | 'Armazenamento Digital'
    | 'Economia de Combustível'
    | 'Concentração'
    | 'Taxa de Fluxo'
    | 'Velocidade Rotacional'
    | 'Radiação'
    | 'Magnético'
    | 'Outros';

export interface MeasurementUnit {
    value: string;
    label: string;
    category: UnitCategory;
}

export const MeasurementUnitCategories: Record<UnitCategory, MeasurementUnit[]> = {
    'Comprimento': [
        { value: 'mm', label: 'Milímetro (mm)', category: 'Comprimento' },
        { value: 'cm', label: 'Centímetro (cm)', category: 'Comprimento' },
        { value: 'm', label: 'Metro (m)', category: 'Comprimento' },
        { value: 'km', label: 'Quilômetro (km)', category: 'Comprimento' },
        { value: 'in', label: 'Polegada (in)', category: 'Comprimento' },
        { value: 'ft', label: 'Pé (ft)', category: 'Comprimento' },
        { value: 'yd', label: 'Jarda (yd)', category: 'Comprimento' },
        { value: 'mi', label: 'Milha (mi)', category: 'Comprimento' },
        { value: 'nmi', label: 'Milha Náutica (nmi)', category: 'Comprimento' }
    ],
    'Área': [
        { value: 'mm²', label: 'Milímetro Quadrado (mm²)', category: 'Área' },
        { value: 'cm²', label: 'Centímetro Quadrado (cm²)', category: 'Área' },
        { value: 'm²', label: 'Metro Quadrado (m²)', category: 'Área' },
        { value: 'km²', label: 'Quilômetro Quadrado (km²)', category: 'Área' },
        { value: 'in²', label: 'Polegada Quadrada (in²)', category: 'Área' },
        { value: 'ft²', label: 'Pé Quadrado (ft²)', category: 'Área' },
        { value: 'yd²', label: 'Jarda Quadrada (yd²)', category: 'Área' },
        { value: 'acre', label: 'Acre', category: 'Área' },
        { value: 'ha', label: 'Hectare (ha)', category: 'Área' }
    ],
    'Volume': [
        { value: 'mm³', label: 'Milímetro Cúbico (mm³)', category: 'Volume' },
        { value: 'cm³', label: 'Centímetro Cúbico (cm³)', category: 'Volume' },
        { value: 'm³', label: 'Metro Cúbico (m³)', category: 'Volume' },
        { value: 'in³', label: 'Polegada Cúbica (in³)', category: 'Volume' },
        { value: 'ft³', label: 'Pé Cúbico (ft³)', category: 'Volume' },
        { value: 'L', label: 'Litro (L)', category: 'Volume' },
        { value: 'mL', label: 'Mililitro (mL)', category: 'Volume' },
        { value: 'gal', label: 'Galão (gal)', category: 'Volume' },
        { value: 'qt', label: 'Quarto (qt)', category: 'Volume' },
        { value: 'pt', label: 'Pinta (pt)', category: 'Volume' },
        { value: 'cup', label: 'Xícara (cup)', category: 'Volume' },
        { value: 'fl oz', label: 'Onça Fluida (fl oz)', category: 'Volume' }
    ],
    'Massa': [
        { value: 'mg', label: 'Miligrama (mg)', category: 'Massa' },
        { value: 'g', label: 'Grama (g)', category: 'Massa' },
        { value: 'kg', label: 'Quilograma (kg)', category: 'Massa' },
        { value: 'tonne', label: 'Tonelada Métrica (t)', category: 'Massa' },
        { value: 'oz', label: 'Onça (oz)', category: 'Massa' },
        { value: 'lb', label: 'Libra (lb)', category: 'Massa' },
        { value: 'ton', label: 'Tonelada Curta (ton)', category: 'Massa' }
    ],
    'Tempo': [
        { value: 'ns', label: 'Nanossegundo (ns)', category: 'Tempo' },
        { value: 'μs', label: 'Microssegundo (μs)', category: 'Tempo' },
        { value: 'ms', label: 'Milissegundo (ms)', category: 'Tempo' },
        { value: 's', label: 'Segundo (s)', category: 'Tempo' },
        { value: 'min', label: 'Minuto (min)', category: 'Tempo' },
        { value: 'h', label: 'Hora (h)', category: 'Tempo' },
        { value: 'day', label: 'Dia (d)', category: 'Tempo' },
        { value: 'week', label: 'Semana', category: 'Tempo' },
        { value: 'month', label: 'Mês', category: 'Tempo' },
        { value: 'year', label: 'Ano', category: 'Tempo' }
    ],
    'Temperatura': [
        { value: '°C', label: 'Grau Celsius (°C)', category: 'Temperatura' },
        { value: '°F', label: 'Grau Fahrenheit (°F)', category: 'Temperatura' },
        { value: 'K', label: 'Kelvin (K)', category: 'Temperatura' }
    ],
    'Pressão': [
        { value: 'Pa', label: 'Pascal (Pa)', category: 'Pressão' },
        { value: 'kPa', label: 'Quilopascal (kPa)', category: 'Pressão' },
        { value: 'MPa', label: 'Megapascal (MPa)', category: 'Pressão' },
        { value: 'bar', label: 'Bar', category: 'Pressão' },
        { value: 'mbar', label: 'Milibar (mbar)', category: 'Pressão' },
        { value: 'psi', label: 'Libra por Polegada Quadrada (psi)', category: 'Pressão' },
        { value: 'atm', label: 'Atmosfera (atm)', category: 'Pressão' },
        { value: 'mmHg', label: 'Milímetro de Mercúrio (mmHg)', category: 'Pressão' },
        { value: 'inHg', label: 'Polegada de Mercúrio (inHg)', category: 'Pressão' },
        { value: 'torr', label: 'Torr', category: 'Pressão' }
    ],
    'Energia': [
        { value: 'J', label: 'Joule (J)', category: 'Energia' },
        { value: 'kJ', label: 'Quilojoule (kJ)', category: 'Energia' },
        { value: 'MJ', label: 'Megajoule (MJ)', category: 'Energia' },
        { value: 'cal', label: 'Caloria (cal)', category: 'Energia' },
        { value: 'kcal', label: 'Quilocaloria (kcal)', category: 'Energia' },
        { value: 'Wh', label: 'Watt-hora (Wh)', category: 'Energia' },
        { value: 'kWh', label: 'Quilowatt-hora (kWh)', category: 'Energia' },
        { value: 'BTU', label: 'Unidade Térmica Britânica (BTU)', category: 'Energia' }
    ],
    'Potência': [
        { value: 'W', label: 'Watt (W)', category: 'Potência' },
        { value: 'kW', label: 'Quilowatt (kW)', category: 'Potência' },
        { value: 'MW', label: 'Megawatt (MW)', category: 'Potência' },
        { value: 'hp', label: 'Cavalo-vapor (hp)', category: 'Potência' }
    ],
    'Velocidade': [
        { value: 'm/s', label: 'Metro por Segundo (m/s)', category: 'Velocidade' },
        { value: 'km/h', label: 'Quilômetro por Hora (km/h)', category: 'Velocidade' },
        { value: 'mph', label: 'Milha por Hora (mph)', category: 'Velocidade' },
        { value: 'ft/s', label: 'Pé por Segundo (ft/s)', category: 'Velocidade' },
        { value: 'kn', label: 'Nó (kn)', category: 'Velocidade' }
    ],
    'Aceleração': [
        { value: 'm/s²', label: 'Metro por Segundo ao Quadrado (m/s²)', category: 'Aceleração' },
        { value: 'g', label: 'Aceleração da Gravidade (g)', category: 'Aceleração' }
    ],
    'Força': [
        { value: 'N', label: 'Newton (N)', category: 'Força' },
        { value: 'kN', label: 'Quilonewton (kN)', category: 'Força' },
        { value: 'lbf', label: 'Libra-força (lbf)', category: 'Força' }
    ],
    'Densidade': [
        { value: 'kg/m³', label: 'Quilograma por Metro Cúbico (kg/m³)', category: 'Densidade' },
        { value: 'g/cm³', label: 'Grama por Centímetro Cúbico (g/cm³)', category: 'Densidade' },
        { value: 'lb/ft³', label: 'Libra por Pé Cúbico (lb/ft³)', category: 'Densidade' }
    ],
    'Corrente Elétrica': [
        { value: 'A', label: 'Ampère (A)', category: 'Corrente Elétrica' },
        { value: 'mA', label: 'Miliampère (mA)', category: 'Corrente Elétrica' },
        { value: 'μA', label: 'Microampère (μA)', category: 'Corrente Elétrica' }
    ],
    'Tensão': [
        { value: 'V', label: 'Volt (V)', category: 'Tensão' },
        { value: 'mV', label: 'Milivolt (mV)', category: 'Tensão' },
        { value: 'kV', label: 'Quilovolt (kV)', category: 'Tensão' }
    ],
    'Resistência Elétrica': [
        { value: 'Ω', label: 'Ohm (Ω)', category: 'Resistência Elétrica' },
        { value: 'kΩ', label: 'Quilo-ohm (kΩ)', category: 'Resistência Elétrica' },
        { value: 'MΩ', label: 'Mega-ohm (MΩ)', category: 'Resistência Elétrica' }
    ],
    'Condutância Elétrica': [
        { value: 'S', label: 'Siemens (S)', category: 'Condutância Elétrica' },
        { value: 'mS', label: 'Milisiemens (mS)', category: 'Condutância Elétrica' },
        { value: 'μS', label: 'Microsiemens (μS)', category: 'Condutância Elétrica' }
    ],
    'Capacitância': [
        { value: 'F', label: 'Farad (F)', category: 'Capacitância' },
        { value: 'μF', label: 'Microfarad (μF)', category: 'Capacitância' },
        { value: 'nF', label: 'Nanofarad (nF)', category: 'Capacitância' },
        { value: 'pF', label: 'Picofarad (pF)', category: 'Capacitância' }
    ],
    'Indutância': [
        { value: 'H', label: 'Henry (H)', category: 'Indutância' },
        { value: 'mH', label: 'Milihenry (mH)', category: 'Indutância' },
        { value: 'μH', label: 'Microhenry (μH)', category: 'Indutância' }
    ],
    'Frequência': [
        { value: 'Hz', label: 'Hertz (Hz)', category: 'Frequência' },
        { value: 'kHz', label: 'Quilohertz (kHz)', category: 'Frequência' },
        { value: 'MHz', label: 'Megahertz (MHz)', category: 'Frequência' },
        { value: 'GHz', label: 'Gigahertz (GHz)', category: 'Frequência' }
    ],
    'Ângulo': [
        { value: '°', label: 'Grau (°)', category: 'Ângulo' },
        { value: 'rad', label: 'Radiano (rad)', category: 'Ângulo' },
        { value: 'grad', label: 'Grado (grad)', category: 'Ângulo' },
        { value: 'arcmin', label: 'Minuto de Arco (arcmin)', category: 'Ângulo' },
        { value: 'arcsec', label: 'Segundo de Arco (arcsec)', category: 'Ângulo' }
    ],
    'Luminância': [
        { value: 'cd/m²', label: 'Candela por Metro Quadrado (cd/m²)', category: 'Luminância' },
        { value: 'nit', label: 'Nit', category: 'Luminância' }
    ],
    'Fluxo Luminoso': [
        { value: 'lm', label: 'Lúmen (lm)', category: 'Fluxo Luminoso' }
    ],
    'Iluminância': [
        { value: 'lx', label: 'Lux (lx)', category: 'Iluminância' },
        { value: 'foot-candle', label: 'Foot-candle', category: 'Iluminância' }
    ],
    'Som': [
        { value: 'dB', label: 'Decibel (dB)', category: 'Som' },
        { value: 'phon', label: 'Phon', category: 'Som' },
        { value: 'sone', label: 'Sone', category: 'Som' }
    ],
    'Armazenamento Digital': [
        { value: 'bit', label: 'Bit', category: 'Armazenamento Digital' },
        { value: 'byte', label: 'Byte', category: 'Armazenamento Digital' },
        { value: 'kB', label: 'Kilobyte (kB)', category: 'Armazenamento Digital' },
        { value: 'MB', label: 'Megabyte (MB)', category: 'Armazenamento Digital' },
        { value: 'GB', label: 'Gigabyte (GB)', category: 'Armazenamento Digital' },
        { value: 'TB', label: 'Terabyte (TB)', category: 'Armazenamento Digital' },
        { value: 'PB', label: 'Petabyte (PB)', category: 'Armazenamento Digital' }
    ],
    'Economia de Combustível': [
        { value: 'L/100km', label: 'Litros por 100 Quilômetros (L/100km)', category: 'Economia de Combustível' },
        { value: 'mpg', label: 'Milhas por Galão (mpg)', category: 'Economia de Combustível' }
    ],
    'Concentração': [
        { value: 'ppm', label: 'Partes por Milhão (ppm)', category: 'Concentração' },
        { value: 'ppb', label: 'Partes por Bilhão (ppb)', category: 'Concentração' },
        { value: 'mol/L', label: 'Moles por Litro (mol/L)', category: 'Concentração' },
        { value: 'mg/L', label: 'Miligramas por Litro (mg/L)', category: 'Concentração' },
        { value: '%', label: 'Porcentagem (%)', category: 'Concentração' }
    ],
    'Taxa de Fluxo': [
        { value: 'L/min', label: 'Litros por Minuto (L/min)', category: 'Taxa de Fluxo' },
        { value: 'm³/h', label: 'Metros Cúbicos por Hora (m³/h)', category: 'Taxa de Fluxo' },
        { value: 'gal/min', label: 'Galões por Minuto (gal/min)', category: 'Taxa de Fluxo' },
        { value: 'cfm', label: 'Pé Cúbico por Minuto (cfm)', category: 'Taxa de Fluxo' }
    ],
    'Velocidade Rotacional': [
        { value: 'rpm', label: 'Rotações por Minuto (rpm)', category: 'Velocidade Rotacional' },
        { value: 'rad/s', label: 'Radianos por Segundo (rad/s)', category: 'Velocidade Rotacional' }
    ],
    'Radiação': [
        { value: 'Gy', label: 'Gray (Gy)', category: 'Radiação' },
        { value: 'Sv', label: 'Sievert (Sv)', category: 'Radiação' },
        { value: 'Bq', label: 'Becquerel (Bq)', category: 'Radiação' },
        { value: 'Ci', label: 'Curie (Ci)', category: 'Radiação' }
    ],
    'Magnético': [
        { value: 'T', label: 'Tesla (T)', category: 'Magnético' },
        { value: 'G', label: 'Gauss (G)', category: 'Magnético' },
        { value: 'Wb', label: 'Weber (Wb)', category: 'Magnético' },
        { value: 'H', label: 'Henry (H)', category: 'Magnético' }
    ],
    'Outros': [
        { value: 'unit', label: 'Unidade', category: 'Outros' },
        { value: 'count', label: 'Contagem', category: 'Outros' },
        { value: 'cycle', label: 'Ciclo', category: 'Outros' },
        { value: 'revolution', label: 'Revolução', category: 'Outros' },
        { value: 'step', label: 'Passo', category: 'Outros' },
        { value: 'click', label: 'Clique', category: 'Outros' },
        { value: 'dose', label: 'Dose', category: 'Outros' }
    ]
} as const;

// Lista plana de todas as unidades para compatibilidade com código existente
export const MeasurementUnits = Object.values(MeasurementUnitCategories).flatMap(units => 
    units.map(unit => unit.value)
);

// Função auxiliar para encontrar a categoria de uma unidade
export function findUnitCategory(unitValue: string): UnitCategory {
    for (const [category, units] of Object.entries(MeasurementUnitCategories)) {
        if (units.some(unit => unit.value === unitValue)) {
            return category as UnitCategory;
        }
    }
    return 'Comprimento'; // Categoria padrão
} 