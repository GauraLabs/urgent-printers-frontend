/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://urgentprinters.in",
  generateRobotsTxt: true,
  generateIndexSitemap: false,

  exclude: ["/account", "/account/*", "/checkout", "/checkout/*", "/cart", "/auth/*"],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account/", "/checkout/", "/cart", "/auth/", "/_next/", "/api/"],
      },
    ],
  },

  transform: async (config, path) => {
    let priority = 0.7;
    let changefreq = "weekly";
    if (path === "/")                            { priority = 1.0;  changefreq = "daily";   }
    else if (path === "/products")               { priority = 0.9;  changefreq = "daily";   }
    else if (path.match(/^\/products\/[^/]+$/))  { priority = 0.85; changefreq = "weekly";  }
    else if (path.match(/^\/products\/.+\/.+$/)) { priority = 0.8;  changefreq = "weekly";  }
    else if (path === "/search")                 { priority = 0.6;  changefreq = "monthly"; }
    else if (path.startsWith("/policies"))       { priority = 0.4;  changefreq = "monthly"; }
    else if (path === "/contact")                { priority = 0.5;  changefreq = "monthly"; }
    return { loc: path, changefreq, priority, lastmod: new Date().toISOString() };
  },
};
