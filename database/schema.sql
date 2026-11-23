CREATE DATABASE IF NOT EXISTS adaptiweb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE adaptiweb;

CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(100) NOT NULL,
    condicion VARCHAR(100) NOT NULL
);

CREATE TABLE Preferencias (
    id_preferencia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    fuente VARCHAR(100),
    tamanio_fuente DECIMAL(10,2),
    interlineado DECIMAL(10,2),
    espacio_letras DECIMAL(10,2),
    espacio_palabras DECIMAL(10,2),
    contraste VARCHAR(100),
    fecha_actualizacion DATETIME,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Pomodoro (
    id_pomodoro INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    minutos_trabajo INT NOT NULL,
    minutos_descanso INT NOT NULL,
    estado VARCHAR(100) NOT NULL DEFAULT 'Reanudado',
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Marcadores (
    id_marcador INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    texto_guardado VARCHAR(255),
    fecha_creacion DATETIME,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE Tareas (
    id_tarea INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    fecha_tarea DATETIME NOT NULL,
    recordatorio DATETIME NULL,
    recordatorio_notificado TINYINT(1) NOT NULL DEFAULT 0,
    estado VARCHAR(100) DEFAULT 'Sin Terminar',
    fecha_creacion DATETIME NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);