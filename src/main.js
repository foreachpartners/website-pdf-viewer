// Проверяем переменные окружения только один раз
const LOGGING_ENABLED = import.meta.env.VITE_ENABLE_LOGGING === 'true';

if (LOGGING_ENABLED) {
    console.log('Environment:', {
        VITE_ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING,
        VITE_BASE_PATH: import.meta.env.VITE_BASE_PATH,
        MODE: import.meta.env.MODE
    });

    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    console.log('Request details:', {
        fullUrl: window.location.href,
        path: window.location.pathname,
        searchParams: Object.fromEntries(urlParams),
        hash: window.location.hash,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        documentTitle: document.title,
        screenResolution: {
            width: window.screen.width,
            height: window.screen.height
        },
        viewportSize: {
            width: window.innerWidth,
            height: window.innerHeight
        }
    });
}

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { PDFLinkService } from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/build/pdf.worker.mjs';
import testPdf from './assets/test.pdf';

// Get parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const isTest = urlParams.get('test') === 'true';
const docFromParams = urlParams.get('doc');

// Получаем путь из URL после базового пути
const basePath = import.meta.env.VITE_BASE_PATH || '/';
const pathName = window.location.pathname;
const docFromPath = pathName.startsWith(basePath) 
    ? pathName.slice(basePath.length) 
    : pathName;

// Приоритет отдаём параметру doc, если он есть
const pdfFile = isTest 
    ? testPdf 
    : docFromParams || (docFromPath || '');

// Control elements
const canvasContainer = document.getElementById('canvasContainer');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// Создаем кнопку скачивания (верхнюю)
const downloadButton = document.createElement('button');
downloadButton.textContent = 'Download PDF';
downloadButton.style.margin = '10px';
downloadButton.style.padding = '8px 16px';
downloadButton.style.display = 'none';
downloadButton.style.backgroundColor = '#007bff';
downloadButton.style.color = '#ffffff';
downloadButton.style.border = 'none';
downloadButton.style.borderRadius = '4px';
downloadButton.style.cursor = 'pointer';
downloadButton.style.fontSize = '14px';

// Создаем нижнюю кнопку с теми же стилями
const bottomDownloadButton = downloadButton.cloneNode(true);

// Добавляем эффект при наведении для обеих кнопок
[downloadButton, bottomDownloadButton].forEach(button => {
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#0056b3';
    });
    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#007bff';
    });
    
    // Обработчик для скачивания
    button.addEventListener('click', () => {
        if (pdfFile) {
            const link = document.createElement('a');
            link.href = pdfFile;
            link.download = pdfFile.split('/').pop();
            link.click();
        }
    });
});

// Размещаем кнопки до и после контейнера
canvasContainer.parentNode.insertBefore(downloadButton, canvasContainer);
canvasContainer.parentNode.insertBefore(bottomDownloadButton, canvasContainer.nextSibling);

// Создаем сервис для обработки ссылок
const linkService = new PDFLinkService();

// Function to display error
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    loadingElement.style.display = 'none';
}

// Функция для отрисовки одной страницы
async function renderPage(page, initialScale = 2.8) {
    try {
        const viewportWidth = window.innerWidth;
        const originalViewport = page.getViewport({ scale: 1 });
        
        // Увеличиваем минимальный масштаб до 1.2
        const padding = 40;
        const scale = (viewportWidth - padding) / originalViewport.width;
        const finalScale = Math.min(Math.max(scale, 1.2), initialScale);
        
        const viewport = page.getViewport({ scale: finalScale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.marginBottom = '20px';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.margin = '0 auto'; // Добавляем автоматические отступы по бокам

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            linkService: linkService // Добавляем linkService в контекст рендеринга
        };

        await page.render(renderContext);
        canvasContainer.appendChild(canvas);
    } catch (error) {
        showError(`Error rendering page: ${error.message}`);
    }
}

// Функция для логирования информации о запросе
function logRequestInfo() {
    if (!import.meta.env.VITE_ENABLE_LOGGING) return;
    
    console.group('PDF Viewer Request Info');
    console.log('Full URL:', window.location.href);
    console.log('Path:', window.location.pathname);
    console.log('Search params:', Object.fromEntries(new URLSearchParams(window.location.search)));
    console.log('Referrer:', document.referrer);
    console.log('User Agent:', navigator.userAgent);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
}

// Функция для отображения PDF
async function renderPDF(url) {
    try {
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.group('PDF Loading Details');
            console.log('Requested PDF URL:', url);
            console.log('Loading started at:', new Date().toISOString());
        }

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

        // Логируем попытку загрузки файла
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.log('Fetching PDF file...');
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers));
            console.log('PDF data size:', (pdfData.byteLength / 1024).toFixed(2), 'KB');
        }

        // Загружаем PDF
        const loadingTask = getDocument({
            data: pdfData,
            verbosity: 1,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        
        // Показываем обе кнопки скачивания после успешной загрузки PDF
        downloadButton.style.display = 'block';
        bottomDownloadButton.style.display = 'block';
        
        // Инициализируем linkService
        linkService.setDocument(pdfDoc);
        linkService.setViewer({
            scrollPageIntoView: ({ pageNumber }) => {
                // Находим нужный canvas и скроллим к нему
                const canvases = canvasContainer.getElementsByTagName('canvas');
                if (canvases[pageNumber - 1]) {
                    canvases[pageNumber - 1].scrollIntoView();
                }
            }
        });

        // Отрисовываем все страницы
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            await renderPage(page);
        }

        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.log('PDF successfully loaded');
            console.log('Number of pages:', pdfDoc.numPages);
            console.groupEnd();
        }

        loadingElement.style.display = 'none';
    } catch (error) {
        // Скрываем обе кнопки при ошибке
        downloadButton.style.display = 'none';
        bottomDownloadButton.style.display = 'none';
        if (import.meta.env.VITE_ENABLE_LOGGING) {
            console.error('PDF Loading Error:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            console.groupEnd();
        }
        showError(`Error loading PDF: ${error.message}\nStack: ${error.stack}`);
    }
}

// Check if file parameter exists and load PDF
if (pdfFile) {
    renderPDF(pdfFile);
} else {
    showError('No PDF file specified');
}
