export const sampleCrawlerJson = [
  {
    "domain": "vnexpress.net",
    "css_queries": [
      "h1.title-detail",
      "p.description",
      "article.fck_detail",
      ".author-info"
    ],
    "name": "VNExpress News"
  },
  {
    "domain": "https://vietnamnet.vn",
    "css_queries": [
      "h1.content-detail-title",
      "div.content-detail-text",
      "span.author"
    ],
    "name": "VietnamNet"
  },
  {
    "domain": "tuoitre.vn",
    "css_queries": [
      "h1.article-title",
      "div.fck",
      ".author-name"
    ]
  },
  {
    "domain": "www.dantri.com.vn",
    "css_queries": [
      "h1.title-page",
      "div.singular-content",
      "div.author-name"
    ],
    "active": true
  },
  {
    "domain": "shopee.vn",
    "css_queries": [
      "div.product-briefing",
      "div.product-price",
      "button.btn-add-to-cart"
    ]
  },
  {
    "domain": "tiki.vn",
    "css_queries": [
      "h1.product-title",
      "div.price-and-sale-info",
      "span.seller-name"
    ]
  },
  {
    "domain": "kenh14.vn",
    "css_queries": [
      "h1.kbwc-title",
      "div.knc-content"
    ]
  }
];

export const sampleWhitelistText = `vnexpress.net
vietnamnet.vn
tuoitre.vn
dantri.com.vn
shopee.vn
tiki.vn
kenh14.vn
lazada.vn
thegioididong.com
fptshop.com.vn
genk.vn
tinhte.vn
cafef.vn
vtv.vn`;
