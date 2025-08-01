/**
 * Triggers a file download with save dialog
 * @param url - The URL to download from
 * @param filename - Optional filename suggestion
 */
export function downloadFile(url: string, filename?: string): void {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;

    // Set download attribute to trigger save dialog
    // Empty string or specific filename both work
    link.download = filename || '';

    // For cross-origin downloads, we might need to open in new tab
    // Check if URL is from the same origin
    // Note: window.location.origin is required here for security checks in file downloads
    try {
        const urlObj = new URL(url, window.location.origin);
        if (urlObj.origin !== window.location.origin) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    } catch {
        // If URL parsing fails, assume it's a relative URL
    }

    // Hide the link
    link.style.display = 'none';

    // Add to body, click, and remove
    document.body.appendChild(link);

    // Use a small timeout to ensure the link is in the DOM
    setTimeout(() => {
        link.click();

        // Clean up after a delay
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
    }, 0);
}

/**
 * Downloads a file using fetch API (for better control and error handling)
 * @param url - The URL to download from
 * @param filename - Filename for the download
 */
export async function downloadFileWithFetch(url: string, filename: string): Promise<void> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Create object URL
        const objectUrl = window.URL.createObjectURL(blob);

        // Trigger download
        downloadFile(objectUrl, filename);

        // Clean up object URL after a delay
        setTimeout(() => {
            window.URL.revokeObjectURL(objectUrl);
        }, 1000);
    } catch {
        console.error('Erro de download');
    }
}
