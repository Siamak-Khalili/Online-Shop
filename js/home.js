document.addEventListener("DOMContentLoaded", function () {
  const commentsSwiper = new Swiper(".comments-swiper", {
    effect: "coverflow",
    grabCursor: true,
    centeredSlides: true,
    coverflowEffect: {
      rotate: 0,
      stretch: 75,
      depth: 100,
      modifier: 3,
      slideShadows: false,
    },
    loop: true,
    // pagination: {
    //   el: ".comments-swiper-pagination",
    //   clickable: true,
    // },
    navigation: {
      nextEl: ".comments-button-next",
      prevEl: ".comments-button-prev",
    },
    breakpoints: {
      1024: {
        slidesPerView: 3,
      },
    },
  });
});



const TWO_DAYS = 3 * 24 * 60 * 60 * 1000;

const targetDate = Date.now() + TWO_DAYS;

function updateTimer() {
  const now = Date.now();
  const diff = targetDate - now;

  if (diff <= 0) {
    clearInterval(timerInterval);
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  document.getElementById("days").textContent = String(days).padStart(2, "0");
  document.getElementById("hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("minutes").textContent = String(minutes).padStart(
    2,
    "0"
  );
  document.getElementById("seconds").textContent = String(seconds).padStart(
    2,
    "0"
  );
}
const timerInterval = setInterval(updateTimer, 1000);
updateTimer();

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tap");
  const tabContents = document.querySelectorAll(".tabs__content");

  if (tabs.length && tabContents.length) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = document.getElementById(tab.dataset.tabTarget);

        if (target) {
          tabs.forEach((t) => t.classList.remove("active"));
          tabContents.forEach((content) => content.classList.remove("active"));

          tab.classList.add("active");
          target.classList.add("active");
        }
      });
    });
  } else {
    console.error("Tabs or contents not found.");
  }
});
