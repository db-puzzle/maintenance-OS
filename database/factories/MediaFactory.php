<?php

namespace Database\Factories;

use App\Models\Media;
use App\Models\Production\Item;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Media>
 */
class MediaFactory extends Factory
{
    protected $model = Media::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $isImage = $this->faker->boolean(70); // 70% chance of being an image

        if ($isImage) {
            $mimeType = $this->faker->randomElement(['image/jpeg', 'image/png', 'image/webp']);
            $extension = match ($mimeType) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            };
        } else {
            $mimeType = $this->faker->randomElement(['application/pdf', 'text/csv', 'application/vnd.ms-excel']);
            $extension = match ($mimeType) {
                'application/pdf' => 'pdf',
                'text/csv' => 'csv',
                'application/vnd.ms-excel' => 'xls',
            };
        }

        $fileName = $this->faker->slug() . '.' . $extension;

        return [
            'model_type' => Item::class,
            'model_id' => Item::factory(),
            'uuid' => Str::uuid(),
            'collection_name' => $isImage ? 'images' : 'documents',
            'name' => $this->faker->words(3, true),
            'file_name' => $fileName,
            'mime_type' => $mimeType,
            'disk' => 'media',
            'conversions_disk' => 'media',
            'size' => $this->faker->numberBetween(10000, 5000000), // 10KB to 5MB
            'manipulations' => [],
            'custom_properties' => [
                'uploaded_by' => 1,
                'uploaded_at' => now()->toIso8601String(),
            ],
            'generated_conversions' => $isImage ? [
                'thumb' => true,
                'preview' => true,
                'large' => false,
            ] : [],
            'responsive_images' => [],
            'order_column' => $this->faker->numberBetween(1, 10),
        ];
    }

    /**
     * Indicate that the media is an image.
     */
    public function image(): static
    {
        return $this->state(function (array $attributes) {
            $mimeType = $this->faker->randomElement(['image/jpeg', 'image/png', 'image/webp']);
            $extension = match ($mimeType) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            };

            return [
                'collection_name' => 'images',
                'mime_type' => $mimeType,
                'file_name' => $this->faker->slug() . '.' . $extension,
                'custom_properties' => array_merge($attributes['custom_properties'] ?? [], [
                    'width' => $this->faker->numberBetween(800, 2000),
                    'height' => $this->faker->numberBetween(600, 1500),
                    'aspect_ratio' => 1.33,
                ]),
                'generated_conversions' => [
                    'thumb' => true,
                    'preview' => true,
                    'large' => true,
                ],
            ];
        });
    }

    /**
     * Indicate that the media is a document.
     */
    public function document(): static
    {
        return $this->state(function (array $attributes) {
            $mimeType = $this->faker->randomElement(['application/pdf', 'text/csv']);
            $extension = match ($mimeType) {
                'application/pdf' => 'pdf',
                'text/csv' => 'csv',
            };

            return [
                'collection_name' => 'documents',
                'mime_type' => $mimeType,
                'file_name' => $this->faker->slug() . '.' . $extension,
                'generated_conversions' => [],
            ];
        });
    }

    /**
     * Indicate that the media is primary.
     */
    public function primary(): static
    {
        return $this->state(function (array $attributes) {
            return [
                'custom_properties' => array_merge($attributes['custom_properties'] ?? [], [
                    'is_primary' => true,
                ]),
            ];
        });
    }
}
