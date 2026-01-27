const cards = document.querySelectorAll('.card');
const lounge = document.querySelector('.lounge');

cards.forEach(c => {
  c.addEventListener('mouseenter', () => {
    lounge.style.transform = c.dataset.target.includes('custom')
      ? 'translateX(-0.5%) scale(1.015)'
      : 'translateX(0.5%) scale(1.015)';
  });
  c.addEventListener('mouseleave', () => {
    lounge.style.transform = 'translateX(0) scale(1)';
  });
  c.addEventListener('click', () => {
    document.body.style.transition = 'opacity 0.6s ease';
    document.body.style.opacity = '0';
    setTimeout(() => window.location.href = c.dataset.target, 600);
  });
});
