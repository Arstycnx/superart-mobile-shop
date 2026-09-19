<?php
// เผื่อ server ตั้งค่า DirectoryIndex ให้หา index.php ก่อน index.html
// ไฟล์นี้แค่ส่งเนื้อหา index.html (ที่ Vite build ออกมา) กลับไปเฉยๆ
readfile(__DIR__ . '/index.html');
