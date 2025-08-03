import { Loader } from '@googlemaps/js-api-loader';
import { useEffect, useRef } from 'react';
interface MapProps {
    coordinates: string | null;
    className?: string;
}
export default function Map({ coordinates, className = '' }: MapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!coordinates || !mapRef.current) return;
        const [lat, lng] = coordinates.split(',').map((coord) => parseFloat(coord.trim()));
        if (isNaN(lat) || isNaN(lng)) return;
        const loader = new Loader({
            apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            version: 'weekly',
            libraries: ['places', 'marker'],
        });
        loader.load().then(() => {
            const map = new google.maps.Map(mapRef.current!, {
                center: { lat, lng },
                zoom: 15,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                    mapTypeIds: ['satellite', 'roadmap'],
                },
                streetViewControl: false,
                fullscreenControl: false,
                mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
                mapTypeId: 'satellite',
                tilt: 0,
                heading: 0,
                restriction: undefined,
            });
            new google.maps.marker.AdvancedMarkerElement({
                map,
                position: { lat, lng },
                title: 'Localização da Planta',
            });
        });
    }, [coordinates]);
    return (
        <div
            ref={mapRef}
            className={`h-[300px] w-full rounded-lg md:h-[400px] lg:h-[500px] ${className} ${
                !coordinates ? 'bg-muted flex items-center justify-center' : ''
            }`}
        >
            {!coordinates && <p className="text-muted-foreground">Coordenadas GPS não disponíveis</p>}
        </div>
    );
}
