/* global self, importScripts */
self.importScripts('https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js');

self.addEventListener('message', async (event) => {
    const { id, file } = event.data;

    try {
        const chunkSize = 2097152; // 2MB chunks for hashing
        const chunks = Math.ceil(file.size / chunkSize);
        const spark = new self.SparkMD5.ArrayBuffer();

        for (let i = 0; i < chunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const arrayBuffer = await chunk.arrayBuffer();
            spark.append(arrayBuffer);

            // Report progress
            const progress = ((i + 1) / chunks) * 100;
            self.postMessage({
                id,
                type: 'progress',
                progress: progress
            });
        }

        const hash = spark.end();

        self.postMessage({
            id,
            type: 'complete',
            hash: hash
        });

    } catch (error) {
        self.postMessage({
            id,
            type: 'error',
            error: error.message
        });
    }
});
