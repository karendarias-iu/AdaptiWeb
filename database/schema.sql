use adaptiweb;

create table Usuarios(
	id_usuario INT auto_increment primary key,
	nombre VARCHAR(100) not null,
	correo VARCHAR(100) unique not null,
	contraseña VARCHAR(100) not null,
	condicion VARCHAR(100) not null
);

create table Preferencias(
	id_preferencia INT auto_increment primary key,
	id_usuario INT,
	fuente VARCHAR(100),
	tamanio_fuente DECIMAL(10,2),
	interlineado DECIMAL(10,2),
	espacio_letras VARCHAR(100),
	espacio_palabras VARCHAR(100),
	contraste VARCHAR(100),
	fecha_actualizacion DATETIME,
	foreign key (id_usuario) references Usuarios(id_usuario)
);

create table Pomodoro(
	id_pomodoro INT auto_increment PRIMARY key,
	id_usuario INT,
	minutos_trabajo INT not null,
	minutos_descanso INT not null,
	estado VARCHAR(100) not null default 'Reanudado',
	foreign key (id_usuario) references Usuarios (id_usuario)
);

create table Marcadores(
	id_marcador INT auto_increment primary key,
	id_usuario INT,
	titulo VARCHAR(100) not null,
	url VARCHAR(255) not null,
	texto_guardado VARCHAR(255),
	fecha_creacion DATETIME,
	foreign key (id_usuario) references Usuarios (id_usuario)
);

create table Tareas(
	id_tarea INT auto_increment primary key,
	id_usuario INT,
	titulo VARCHAR(100) not null,
	descripcion VARCHAR(255) not null,
	fecha_tarea DATETIME not null,
	estado VARCHAR(100) default 'Sin Terminar',
	fecha_creacion DATETIME not null,
	foreign key (id_usuario) references Usuarios (id_usuario)
);