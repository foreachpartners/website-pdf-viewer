import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = './pdf.worker.js';

const url = '/home/arezvov/Documents/fep/Sales Partner for ForEach Partners.pdf';

const canvas = document.getElementById('pdfCanvas');
const context = canvas.getContext('2d');

// Загружаем и отображаем PDF
getDocument(url).promise.then(pdf => {
    pdf.getPage(1).then(page => {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };
        page.render(renderContext);
    });
});
