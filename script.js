const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const navLinks = document.querySelectorAll(".nav-menu a[href^='#']");
const pageSections = document.querySelectorAll("main section[id]");
const revealItems = document.querySelectorAll(".reveal");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if ("IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const matchingLink = document.querySelector(`.nav-menu a[href="#${entry.target.id}"]`);
        if (!matchingLink) {
          return;
        }

        if (entry.isIntersecting) {
          navLinks.forEach((link) => link.classList.remove("is-active"));
          matchingLink.classList.add("is-active");
        }
      });
    },
    {
      threshold: 0.45,
      rootMargin: "-20% 0px -35% 0px"
    }
  );

  pageSections.forEach((section) => navObserver.observe(section));
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextPanel = button.dataset.panel;

    tabButtons.forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-selected", String(item === button));
    });

    tabPanels.forEach((panel) => {
      const isTarget = panel.id === `panel-${nextPanel}`;
      panel.classList.toggle("is-active", isTarget);
      panel.hidden = !isTarget;
    });

    button.classList.add("is-active");
  });
});
