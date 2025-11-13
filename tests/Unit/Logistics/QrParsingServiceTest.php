<?php

namespace Tests\Unit\Logistics;

use App\Models\Production\ManufacturingOrder;
use App\Models\Production\Shipment;
use App\Models\Production\ShipmentItem;
use App\Services\Logistics\QrParsingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit tests for QR code parsing service.
 *
 * Tests parsing of manufacturing order numbers from QR code URLs,
 * validating that the existing MO QR code system works seamlessly
 * with the logistics module.
 */
class QrParsingServiceTest extends TestCase
{
    use RefreshDatabase;

    protected QrParsingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new QrParsingService;
    }

    /**
     * Test parses MO number from full URL.
     */
    public function test_parses_mo_number_from_full_url(): void
    {
        $url = 'https://app.com/production/orders/MO-2024-0001/qr';

        $result = $this->service->parseMoNumberFromQr($url);

        expect($result)->toBe('MO-2024-0001');
    }

    /**
     * Test parses MO number from relative path.
     */
    public function test_parses_mo_number_from_relative_path(): void
    {
        $path = '/production/orders/MO-2024-0001/qr';

        $result = $this->service->parseMoNumberFromQr($path);

        expect($result)->toBe('MO-2024-0001');
    }

    /**
     * Test parses MO number without /qr suffix.
     */
    public function test_parses_mo_number_without_qr_suffix(): void
    {
        $path = '/production/orders/MO-2024-0001';

        $result = $this->service->parseMoNumberFromQr($path);

        expect($result)->toBe('MO-2024-0001');
    }

    /**
     * Test parses direct MO number.
     */
    public function test_parses_direct_mo_number(): void
    {
        $result = $this->service->parseMoNumberFromQr('MO-2024-0001');

        expect($result)->toBe('MO-2024-0001');
    }

    /**
     * Test returns null for invalid QR content.
     */
    public function test_returns_null_for_invalid_qr_content(): void
    {
        $result = $this->service->parseMoNumberFromQr('invalid-content');

        expect($result)->toBeNull();
    }

    /**
     * Test finds MO from QR code.
     */
    public function test_finds_mo_from_qr_code(): void
    {
        $mo = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-2024-0001',
        ]);

        $result = $this->service->findMoFromQr('MO-2024-0001');

        expect($result)->not->toBeNull()
            ->and($result->id)->toBe($mo->id);
    }

    /**
     * Test validates QR belongs to shipment.
     */
    public function test_validates_qr_belongs_to_shipment(): void
    {
        $shipment = Shipment::factory()->create();
        $mo = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-2024-0001',
        ]);

        ShipmentItem::factory()->create([
            'shipment_id' => $shipment->id,
            'manufacturing_order_id' => $mo->id,
        ]);

        $result = $this->service->validateQrForShipment('MO-2024-0001', $shipment->id);

        expect($result['valid'])->toBeTrue()
            ->and($result['mo']->id)->toBe($mo->id);
    }

    /**
     * Test validates QR not in shipment returns error.
     */
    public function test_validates_qr_not_in_shipment_returns_error(): void
    {
        $shipment = Shipment::factory()->create();
        $mo = ManufacturingOrder::factory()->create([
            'order_number' => 'MO-2024-0001',
        ]);

        // Don't add MO to shipment
        $result = $this->service->validateQrForShipment('MO-2024-0001', $shipment->id);

        expect($result['valid'])->toBeFalse()
            ->and($result)->toHaveKey('error');
    }
}
