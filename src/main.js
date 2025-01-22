import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';
import testPdf from './assets/test.pdf';

// Get parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const isTest = urlParams.get('test') === 'true';
const pdfFile = isTest ? testPdf : urlParams.get('doc');

// Control elements
const canvasContainer = document.getElementById('canvasContainer');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// Function to display error
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    loadingElement.style.display = 'none';
}

// Функция для отрисовки одной страницы
async function renderPage(page, scale = 1.5) {
    try {
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.marginBottom = '20px';

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext);
        canvasContainer.appendChild(canvas);
    } catch (error) {
        showError(`Error rendering page: ${error.message}`);
    }
}

// Функция для отображения PDF
async function renderPDF(url) {
    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        canvasContainer.innerHTML = ''; // Очищаем контейнер

        if (url.startsWith('http://') || url.startsWith('https://')) {
            throw new Error('Only relative paths are supported');
        }

        // Настройка воркера
        GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.mjs',
            import.meta.url
        ).toString();

        // Загружаем файл
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pdfData = await response.arrayBuffer();

        // Загружаем PDF
        const loadingTask = getDocument({
            data: pdfData,
            verbosity: 1,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        
        // Отрисовываем все страницы
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            await renderPage(page);
        }

        loadingElement.style.display = 'none';
    } catch (error) {
        showError(`Error loading PDF: ${error.message}\nStack: ${error.stack}`);
        console.error('Detailed error:', error);
    }
}

// Check if file parameter exists and load PDF
if (pdfFile) {
    renderPDF(pdfFile);
} else {
    showError('No PDF file specified');
}
