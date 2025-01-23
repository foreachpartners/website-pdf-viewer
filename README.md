# PDF Viewer Service

A web-based PDF viewer service built with PDF.js that allows viewing static PDF files through URL parameters. The service provides a secure way to view PDF documents stored on the server through a web interface.

## Test links

https://foreachpartners.com/docviewer/?test=true
https://foreachpartners.com/docviewer/?doc=/docs/Sales-Partner-for-ForEach-Partners.pdf
https://foreachpartners.com/view/docs/Sales-Partner-for-ForEach-Partners.pdf

## Overview

This service provides a web interface for viewing PDF documents stored on the server. It uses:

- PDF.js for rendering PDF files
- Vite for building and development
- Nginx for serving files and routing

## Features

- Direct PDF viewing through URL parameters
- Secure file serving through nginx internal locations
- Clean and responsive interface
- Loading and error states handling
- Mobile-friendly design
- Support for multi-page PDFs
- Automatic page scaling and responsive layout

## Project Structure

```txt
project-root/
├── src/
│   ├── index.html
│   ├── main.js
│   └── styles.css
├── nginx/
│   └── pdf-viewer.conf
├── build/           # Generated after build
└── node_modules/    # Generated after install
```

## Setup

### 1. Application Setup

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build
```

### 2. PDF Storage Setup

1. Create a directory for PDF storage:

```bash
sudo mkdir -p /var/www/pdf-storage
sudo chown -R www-data:www-data /var/www/pdf-storage
```

2. Place your PDF files in the storage directory:

```bash
sudo cp your-document.pdf /var/www/pdf-storage/
```

### 3. Nginx Configuration

1. Copy the nginx configuration:

```bash
sudo cp nginx/pdf-viewer.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/pdf-viewer.conf /etc/nginx/sites-enabled/
```

Example nginx configuration (pdf-viewer.conf):

```nginx
server {
    listen 80;
    server_name pdf-viewer.example.com;  # Замените на ваш домен

    # Корневая директория для приложения просмотрщика
    root /var/www/pdf-viewer;
    index index.html;

    # Локация для просмотра PDF
    location /view/ {
        alias /var/www/pdf-viewer/;
        try_files $uri /index.html;
    }

    # Внутренняя локация для PDF файлов
    location /pdf-internal/ {
        internal;
        alias /var/www/pdf-storage/;
        
        # Разрешаем только PDF файлы
        if ($request_filename !~ "\.pdf$") {
            return 403;
        }
        
        # Базовые заголовки безопасности
        add_header X-Content-Type-Options "nosniff";
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        
        # Правильный тип контента
        types {
            application/pdf pdf;
        }
    }

    # Статические файлы приложения
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public";
    }

    # Запрещаем прямой доступ к PDF хранилищу
    location /pdf-storage/ {
        deny all;
    }
}
```

2. Create viewer application directory:

```bash
sudo mkdir -p /var/www/pdf-viewer
sudo chown -R www-data:www-data /var/www/pdf-viewer
```

3. Deploy the built application:

```bash
sudo cp -r build/* /var/www/pdf-viewer/
```

4. Test and restart nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Usage

### Viewing PDFs

Access your PDFs through URLs like:

```bash
http://your-domain.com/view/document.pdf
```

### URL Structure

- `/view/document.pdf` - Views a specific PDF
- The actual PDF files are stored in `/var/www/pdf-storage/` but are not directly accessible
- The viewer application is served from `/var/www/pdf-viewer/`

### Example Directory Structure

```txt
/var/www/
├── pdf-storage/
│   ├── document1.pdf
│   └── document2.pdf
└── pdf-viewer/
    ├── index.html
    ├── assets/
    └── ...
```

## Development

```bash
# Start development server
pnpm start
```

## Security Features

- PDF files are served through internal nginx location
- Direct access to PDF storage is prevented
- File paths are sanitized to prevent directory traversal
- Only .pdf files are allowed
- Basic security headers are included:
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection

## Browser Support

The viewer supports all modern browsers:

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC