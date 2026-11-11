document.addEventListener('DOMContentLoaded', () => {

  // Elementos de autenticación
  const btnShowLogin = document.getElementById('btn-show-login');
  const btnShowRegister = document.getElementById('btn-show-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  // Vistas principales
  const viewAuth = document.getElementById('view-auth');
  const viewDashboard = document.getElementById('view-dashboard');

  // Menú lateral
  const menuBtn = document.getElementById('menu-btn');
  let desplegado = false;
  const sidebar = document.getElementById('sidebar');

  function inicio(){
    let headerSize = document.querySelector('.header').getBoundingClientRect().bottom;
     sidebar.style.top = `${headerSize}px`;
  }
  inicio();

  // 1. Mostrar/Ocultar Formularios de Login y Registro
  btnShowLogin?.addEventListener('click', () => {
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  });

  btnShowRegister?.addEventListener('click', () => {
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });

  // 2. Simulación de Inicio de Sesión / Registro -> Pasar al Dashboard
  formLogin?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Aquí irá la validación fetch a tu backend
    viewAuth.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
  });

  formRegister?.addEventListener('submit', (e) => {
    e.preventDefault();
    viewAuth.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
  });

  // 3. Control del Menú Lateral
  menuBtn?.addEventListener('click', () => {
    desplegado = !desplegado;
    if(desplegado){
        sidebar.classList.remove('hidden');
    }else{
        sidebar.classList.add('hidden');
    }

  });


});