'use client'

import { useMemo } from 'react'
import { useLanguageStore } from '@/stores/language-store'

export type Language = 'fr' | 'ar' | 'en'

type TranslationKeys = {
  // Navigation
  nav: {
    home: string
    catalog: string
    cart: string
    admin: string
    search: string
    language: string
    bookDetail: string
    checkout: string
    orderSuccess: string
    orders: string
  }
  // Home page
  home: {
    heroTitle: string
    heroSubtitle: string
    featuredBooks: string
    browseCategories: string
    printOnDemand: string
    printOnDemandDesc: string
    newArrivals: string
    bestSellers: string
    viewAll: string
    exploreCatalog: string
    whyKitabi: string
    fastPrinting: string
    fastPrintingDesc: string
    qualityPrint: string
    qualityPrintDesc: string
    wideSelection: string
    wideSelectionDesc: string
    deliveryAcross: string
    deliveryAcrossDesc: string
    howItWorks: string
    step1: string
    step1Desc: string
    step2: string
    step2Desc: string
    step3: string
    step3Desc: string
    step4: string
    step4Desc: string
  }
  // Catalog
  catalog: {
    filterBy: string
    sortBy: string
    priceRange: string
    category: string
    author: string
    language: string
    allCategories: string
    allAuthors: string
    allLanguages: string
    resetFilters: string
    noResults: string
    results: string
    result: string
    showing: string
    of: string
    books: string
    sortNewest: string
    sortOldest: string
    sortPriceLow: string
    sortPriceHigh: string
    sortTitleAZ: string
    sortTitleZA: string
    minPrice: string
    maxPrice: string
    apply: string
    clearAll: string
    activeFilters: string
    availableOnly: string
    inStock: string
  }
  // Book detail
  book: {
    title: string
    author: string
    description: string
    publisher: string
    pages: string
    isbn: string
    language: string
    price: string
    printDelay: string
    addToCart: string
    printOnDemandNote: string
    available: string
    unavailable: string
    outOfStock: string
    details: string
    specifications: string
    relatedBooks: string
    quantity: string
    addedToCart: string
    goCheck: string
    backToCatalog: string
    share: string
    category: string
    publishDate: string
    format: string
    paperback: string
    aboutAuthor: string
  }
  // Cart
  cart: {
    yourCart: string
    empty: string
    emptyDesc: string
    total: string
    subtotal: string
    proceedToCheckout: string
    remove: string
    quantity: string
    continueShopping: string
    updateQuantity: string
    itemAdded: string
    itemRemoved: string
    orderSummary: string
    shippingNote: string
    freeShipping: string
    items: string
    item: string
  }
  // Checkout
  checkout: {
    fullName: string
    phone: string
    wilaya: string
    commune: string
    address: string
    note: string
    placeOrder: string
    orderSummary: string
    paymentMethod: string
    cashOnDelivery: string
    orderSuccess: string
    orderNumber: string
    orderPlaced: string
    orderConfirmed: string
    thankYou: string
    orderDetails: string
    shippingInfo: string
    contactInfo: string
    reviewOrder: string
    termsAccept: string
    requiredField: string
    invalidPhone: string
    invalidName: string
    confirmOrder: string
    yourInformation: string
    deliveryInfo: string
    paymentInfo: string
    codDescription: string
    estimatedDelivery: string
    backToCart: string
  }
  // Order statuses
  orderStatus: {
    nouvelle: string
    confirmee: string
    en_impression: string
    prete_a_livrer: string
    expediee: string
    livree: string
    annulee: string
  }
  // Order success
  orderSuccess: {
    title: string
    subtitle: string
    orderNumber: string
    orderDate: string
    status: string
    continueShopping: string
    trackOrder: string
    estimatedDelivery: string
    thankYou: string
    confirmationSent: string
  }
  // Admin
  admin: {
    dashboard: string
    manageBooks: string
    manageOrders: string
    manageCategories: string
    importISBN: string
    socialMedia: string
    addBook: string
    editBook: string
    publish: string
    unpublish: string
    delete: string
    totalBooks: string
    totalOrders: string
    totalRevenue: string
    totalCategories: string
    recentOrders: string
    quickActions: string
    login: string
    logout: string
    email: string
    password: string
    loginTitle: string
    loginSubtitle: string
    loginError: string
    welcome: string
    overview: string
    statistics: string
    bookManagement: string
    orderManagement: string
    categoryManagement: string
    isbnImport: string
    socialMediaManagement: string
    published: string
    draft: string
    all: string
    searchBooks: string
    noBooks: string
    confirmDelete: string
    confirmDeleteDesc: string
    bulkActions: string
    export: string
    filterStatus: string
    ordersToday: string
    pendingOrders: string
    completedOrders: string
    cancelledOrders: string
    revenue: string
    averageOrder: string
    topBooks: string
    orderDetails: string
    updateStatus: string
    customerInfo: string
    orderItems: string
    isbnInput: string
    isbnPlaceholder: string
    importButton: string
    importSuccess: string
    importError: string
    fetchingBook: string
    autoFill: string
    coverImage: string
    categorySlug: string
    priceSale: string
    pricePrint: string
    margin: string
    printDelay: string
    isAvailable: string
    isDraft: string
    isPublished: string
    bulkImport: string
    isbnListLabel: string
    importAll: string
    saveBook: string
    updateBook: string
    addCategory: string
    categoryNameFr: string
    categoryNameAr: string
    categoryNameEn: string
    categorySlug: string
    editCategory: string
    deleteCategory: string
    socialPlatform: string
    postContent: string
    schedulePost: string
    publishNow: string
    facebook: string
    instagram: string
    postStatus: string
    brouillon: string
    programmee: string
    publiee: string
    echouee: string
  }
  // Common
  common: {
    loading: string
    error: string
    save: string
    cancel: string
    confirm: string
    delete: string
    edit: string
    view: string
    back: string
    next: string
    previous: string
    of: string
    searchPlaceholder: string
    noResults: string
    close: string
    actions: string
    status: string
    date: string
    amount: string
    name: string
    description: string
    image: string
    createdAt: string
    updatedAt: string
    yes: string
    no: string
    or: string
    and: string
    all: string
    selected: string
    none: string
    required: string
    optional: string
    success: string
    warning: string
    info: string
    danger: string
    tryAgain: string
    goToHome: string
    page: string
    perPage: string
    showing: string
    total: string
    more: string
    less: string
    showMore: string
    showLess: string
    currency: string
    da: string
  }
  // Footer
  footer: {
    about: string
    aboutDesc: string
    quickLinks: string
    contactUs: string
    followUs: string
    rights: string
    privacy: string
    terms: string
    faq: string
    contact: string
    email: string
    phone: string
    address: string
  }
  // Errors
  errors: {
    notFound: string
    notFoundDesc: string
    serverError: string
    serverErrorDesc: string
    networkError: string
    networkErrorDesc: string
    unauthorized: string
    unauthorizedDesc: string
    forbidden: string
    forbiddenDesc: string
  }
}

const translations: Record<Language, TranslationKeys> = {
  fr: {
    nav: {
      home: 'Accueil',
      catalog: 'Catalogue',
      cart: 'Panier',
      admin: 'Administration',
      search: 'Rechercher',
      language: 'Langue',
      bookDetail: 'Détail du livre',
      checkout: 'Commander',
      orderSuccess: 'Commande confirmée',
      orders: 'Commandes',
    },
    home: {
      heroTitle: 'Votre librairie en ligne, imprimée à la demande',
      heroSubtitle: 'Découvrez des milliers de livres, imprimés spécialement pour vous et livrés partout en Algérie',
      featuredBooks: 'Livres en vedette',
      browseCategories: 'Parcourir les catégories',
      printOnDemand: 'Impression à la demande',
      printOnDemandDesc: 'Chaque livre est imprimé spécialement pour vous',
      newArrivals: 'Nouveautés',
      bestSellers: 'Meilleures ventes',
      viewAll: 'Voir tout',
      exploreCatalog: 'Explorer le catalogue',
      whyKitabi: 'Pourquoi Kitabi ?',
      fastPrinting: 'Impression rapide',
      fastPrintingDesc: 'Vos livres sont imprimés et expédiés en 3 à 5 jours ouvrables',
      qualityPrint: 'Impression de qualité',
      qualityPrintDesc: 'Papier de haute qualité et impression professionnelle pour chaque livre',
      wideSelection: 'Large sélection',
      wideSelectionDesc: 'Des milliers de titres disponibles en français, arabe et anglais',
      deliveryAcross: 'Livraison partout en Algérie',
      deliveryAcrossDesc: 'Livraison dans les 58 wilayas avec suivi de commande',
      howItWorks: 'Comment ça marche ?',
      step1: 'Choisissez votre livre',
      step1Desc: 'Parcourez notre catalogue et sélectionnez les livres qui vous intéressent',
      step2: 'Nous l\'imprimons',
      step2Desc: 'Votre livre est imprimé spécialement pour vous avec une qualité professionnelle',
      step3: 'Livraison rapide',
      step3Desc: 'Recevez votre commande directement chez vous ou au bureau de poste',
      step4: 'Profitez de la lecture',
      step4Desc: 'Détendez-vous et savourez votre nouveau livre fraîchement imprimé',
    },
    catalog: {
      filterBy: 'Filtrer par',
      sortBy: 'Trier par',
      priceRange: 'Fourchette de prix',
      category: 'Catégorie',
      author: 'Auteur',
      language: 'Langue',
      allCategories: 'Toutes les catégories',
      allAuthors: 'Tous les auteurs',
      allLanguages: 'Toutes les langues',
      resetFilters: 'Réinitialiser les filtres',
      noResults: 'Aucun résultat trouvé',
      results: 'résultats',
      result: 'résultat',
      showing: 'Affichage de',
      of: 'sur',
      books: 'livres',
      sortNewest: 'Plus récent',
      sortOldest: 'Plus ancien',
      sortPriceLow: 'Prix croissant',
      sortPriceHigh: 'Prix décroissant',
      sortTitleAZ: 'Titre A-Z',
      sortTitleZA: 'Titre Z-A',
      minPrice: 'Prix min',
      maxPrice: 'Prix max',
      apply: 'Appliquer',
      clearAll: 'Tout effacer',
      activeFilters: 'Filtres actifs',
      availableOnly: 'Disponible uniquement',
      inStock: 'En stock',
    },
    book: {
      title: 'Titre',
      author: 'Auteur',
      description: 'Description',
      publisher: 'Éditeur',
      pages: 'Pages',
      isbn: 'ISBN',
      language: 'Langue',
      price: 'Prix',
      printDelay: 'Délai d\'impression',
      addToCart: 'Ajouter au panier',
      printOnDemandNote: 'Ce livre est imprimé à la demande. Délai d\'impression estimé :',
      available: 'Disponible',
      unavailable: 'Indisponible',
      outOfStock: 'Rupture de stock',
      details: 'Détails',
      specifications: 'Caractéristiques',
      relatedBooks: 'Livres similaires',
      quantity: 'Quantité',
      addedToCart: 'Ajouté au panier',
      goCheck: 'Voir le panier',
      backToCatalog: 'Retour au catalogue',
      share: 'Partager',
      category: 'Catégorie',
      publishDate: 'Date de publication',
      format: 'Format',
      paperback: 'Broché',
      aboutAuthor: 'À propos de l\'auteur',
    },
    cart: {
      yourCart: 'Votre panier',
      empty: 'Votre panier est vide',
      emptyDesc: 'Parcourez notre catalogue pour trouver des livres qui vous plaisent',
      total: 'Total',
      subtotal: 'Sous-total',
      proceedToCheckout: 'Passer à la commande',
      remove: 'Supprimer',
      quantity: 'Quantité',
      continueShopping: 'Continuer vos achats',
      updateQuantity: 'Mettre à jour la quantité',
      itemAdded: 'Article ajouté au panier',
      itemRemoved: 'Article retiré du panier',
      orderSummary: 'Résumé de la commande',
      shippingNote: 'Frais de livraison calculés à l\'étape suivante',
      freeShipping: 'Livraison gratuite à partir de',
      items: 'articles',
      item: 'article',
    },
    checkout: {
      fullName: 'Nom complet',
      phone: 'Téléphone',
      wilaya: 'Wilaya',
      commune: 'Commune',
      address: 'Adresse',
      note: 'Note (optionnel)',
      placeOrder: 'Confirmer la commande',
      orderSummary: 'Résumé de la commande',
      paymentMethod: 'Mode de paiement',
      cashOnDelivery: 'Paiement à la livraison',
      orderSuccess: 'Commande confirmée !',
      orderNumber: 'Numéro de commande',
      orderPlaced: 'Commande passée',
      orderConfirmed: 'Commande confirmée',
      thankYou: 'Merci pour votre commande !',
      orderDetails: 'Détails de la commande',
      shippingInfo: 'Informations de livraison',
      contactInfo: 'Coordonnées',
      reviewOrder: 'Réviser la commande',
      termsAccept: 'J\'accepte les conditions générales de vente',
      requiredField: 'Ce champ est requis',
      invalidPhone: 'Numéro de téléphone invalide',
      invalidName: 'Nom invalide',
      confirmOrder: 'Confirmer la commande',
      yourInformation: 'Vos informations',
      deliveryInfo: 'Informations de livraison',
      paymentInfo: 'Informations de paiement',
      codDescription: 'Vous paierez en espèces à la réception de votre commande',
      estimatedDelivery: 'Livraison estimée',
      backToCart: 'Retour au panier',
    },
    orderStatus: {
      nouvelle: 'Nouvelle',
      confirmee: 'Confirmée',
      en_impression: 'En impression',
      prete_a_livrer: 'Prête à livrer',
      expediee: 'Expédiée',
      livree: 'Livrée',
      annulee: 'Annulée',
    },
    orderSuccess: {
      title: 'Commande confirmée !',
      subtitle: 'Votre commande a été enregistrée avec succès',
      orderNumber: 'Numéro de commande',
      orderDate: 'Date de commande',
      status: 'Statut',
      continueShopping: 'Continuer vos achats',
      trackOrder: 'Suivre la commande',
      estimatedDelivery: 'Livraison estimée sous 5-7 jours ouvrables',
      thankYou: 'Merci pour votre confiance !',
      confirmationSent: 'Un SMS de confirmation a été envoyé à votre numéro',
    },
    admin: {
      dashboard: 'Tableau de bord',
      manageBooks: 'Gérer les livres',
      manageOrders: 'Gérer les commandes',
      manageCategories: 'Gérer les catégories',
      importISBN: 'Importer ISBN',
      socialMedia: 'Réseaux sociaux',
      addBook: 'Ajouter un livre',
      editBook: 'Modifier le livre',
      publish: 'Publier',
      unpublish: 'Dépublier',
      delete: 'Supprimer',
      totalBooks: 'Total livres',
      totalOrders: 'Total commandes',
      totalRevenue: 'Revenus totaux',
      totalCategories: 'Total catégories',
      recentOrders: 'Commandes récentes',
      quickActions: 'Actions rapides',
      login: 'Connexion',
      logout: 'Déconnexion',
      email: 'Email',
      password: 'Mot de passe',
      loginTitle: 'Connexion administrateur',
      loginSubtitle: 'Entrez vos identifiants pour accéder au panneau d\'administration',
      loginError: 'Identifiants incorrects',
      welcome: 'Bienvenue',
      overview: 'Vue d\'ensemble',
      statistics: 'Statistiques',
      bookManagement: 'Gestion des livres',
      orderManagement: 'Gestion des commandes',
      categoryManagement: 'Gestion des catégories',
      isbnImport: 'Import ISBN',
      socialMediaManagement: 'Gestion des réseaux sociaux',
      published: 'Publié',
      draft: 'Brouillon',
      all: 'Tous',
      searchBooks: 'Rechercher des livres...',
      noBooks: 'Aucun livre trouvé',
      confirmDelete: 'Confirmer la suppression',
      confirmDeleteDesc: 'Cette action est irréversible. Êtes-vous sûr de vouloir supprimer cet élément ?',
      bulkActions: 'Actions groupées',
      export: 'Exporter',
      filterStatus: 'Filtrer par statut',
      ordersToday: 'Commandes aujourd\'hui',
      pendingOrders: 'Commandes en attente',
      completedOrders: 'Commandes terminées',
      cancelledOrders: 'Commandes annulées',
      revenue: 'Revenus',
      averageOrder: 'Panier moyen',
      topBooks: 'Livres les plus vendus',
      orderDetails: 'Détails de la commande',
      updateStatus: 'Mettre à jour le statut',
      customerInfo: 'Informations client',
      orderItems: 'Articles commandés',
      isbnInput: 'Numéro ISBN',
      isbnPlaceholder: 'Entrez l\'ISBN du livre (ex: 978-2-1234-5678-9)',
      importButton: 'Importer',
      importSuccess: 'Livre importé avec succès',
      importError: 'Erreur lors de l\'importation',
      fetchingBook: 'Récupération des informations du livre...',
      autoFill: 'Remplissage automatique',
      coverImage: 'Image de couverture',
      categorySlug: 'Catégorie (slug)',
      priceSale: 'Prix de vente',
      pricePrint: 'Prix d\'impression',
      margin: 'Marge',
      printDelay: 'Délai d\'impression',
      isAvailable: 'Disponible',
      isDraft: 'Brouillon',
      isPublished: 'Publié',
      bulkImport: 'Import en masse',
      isbnListLabel: 'Liste ISBN (un par ligne)',
      importAll: 'Tout importer',
      saveBook: 'Enregistrer le livre',
      updateBook: 'Mettre à jour le livre',
      addCategory: 'Ajouter une catégorie',
      categoryNameFr: 'Nom (Français)',
      categoryNameAr: 'Nom (Arabe)',
      categoryNameEn: 'Nom (Anglais)',
      categorySlug: 'Slug',
      editCategory: 'Modifier la catégorie',
      deleteCategory: 'Supprimer la catégorie',
      socialPlatform: 'Plateforme',
      postContent: 'Contenu du post',
      schedulePost: 'Programmer la publication',
      publishNow: 'Publier maintenant',
      facebook: 'Facebook',
      instagram: 'Instagram',
      postStatus: 'Statut du post',
      brouillon: 'Brouillon',
      programmee: 'Programmé',
      publiee: 'Publié',
      echouee: 'Échoué',
    },
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      save: 'Enregistrer',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      delete: 'Supprimer',
      edit: 'Modifier',
      view: 'Voir',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      of: 'sur',
      searchPlaceholder: 'Rechercher...',
      noResults: 'Aucun résultat',
      close: 'Fermer',
      actions: 'Actions',
      status: 'Statut',
      date: 'Date',
      amount: 'Montant',
      name: 'Nom',
      description: 'Description',
      image: 'Image',
      createdAt: 'Créé le',
      updatedAt: 'Mis à jour le',
      yes: 'Oui',
      no: 'Non',
      or: 'ou',
      and: 'et',
      all: 'Tous',
      selected: 'sélectionné(s)',
      none: 'Aucun',
      required: 'Requis',
      optional: 'Optionnel',
      success: 'Succès',
      warning: 'Attention',
      info: 'Information',
      danger: 'Danger',
      tryAgain: 'Réessayer',
      goToHome: 'Retour à l\'accueil',
      page: 'Page',
      perPage: 'Par page',
      showing: 'Affichage',
      total: 'Total',
      more: 'Plus',
      less: 'Moins',
      showMore: 'Voir plus',
      showLess: 'Voir moins',
      currency: 'DA',
      da: 'DA',
    },
    footer: {
      about: 'À propos de Kitabi',
      aboutDesc: 'Kitabi est votre librairie en ligne spécialisée dans l\'impression à la demande. Nous offrons une large sélection de livres en français, arabe et anglais, imprimés avec soin et livrés partout en Algérie.',
      quickLinks: 'Liens rapides',
      contactUs: 'Contactez-nous',
      followUs: 'Suivez-nous',
      rights: 'Tous droits réservés',
      privacy: 'Politique de confidentialité',
      terms: 'Conditions d\'utilisation',
      faq: 'FAQ',
      contact: 'Contact',
      email: 'contact@kitabi.dz',
      phone: '+213 XXX XXX XXX',
      address: 'Alger, Algérie',
    },
    errors: {
      notFound: 'Page non trouvée',
      notFoundDesc: 'La page que vous recherchez n\'existe pas ou a été déplacée.',
      serverError: 'Erreur serveur',
      serverErrorDesc: 'Une erreur est survenue sur le serveur. Veuillez réessayer plus tard.',
      networkError: 'Erreur réseau',
      networkErrorDesc: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      unauthorized: 'Non autorisé',
      unauthorizedDesc: 'Vous devez être connecté pour accéder à cette page.',
      forbidden: 'Accès interdit',
      forbiddenDesc: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
    },
  },

  ar: {
    nav: {
      home: 'الرئيسية',
      catalog: 'الكتالوج',
      cart: 'السلة',
      admin: 'الإدارة',
      search: 'بحث',
      language: 'اللغة',
      bookDetail: 'تفاصيل الكتاب',
      checkout: 'الطلب',
      orderSuccess: 'تم تأكيد الطلب',
      orders: 'الطلبات',
    },
    home: {
      heroTitle: 'مكتبتك الإلكترونية، مطبوعة عند الطلب',
      heroSubtitle: 'اكتشف آلاف الكتب، مطبوعة خصيصاً لك وموصلة إلى كل ولايات الجزائر',
      featuredBooks: 'كتب مميزة',
      browseCategories: 'تصفح الفئات',
      printOnDemand: 'طباعة عند الطلب',
      printOnDemandDesc: 'كل كتاب يُطبع خصيصاً لك',
      newArrivals: 'وصل حديثاً',
      bestSellers: 'الأكثر مبيعاً',
      viewAll: 'عرض الكل',
      exploreCatalog: 'استكشف الكتالوج',
      whyKitabi: 'لماذا كتبي ؟',
      fastPrinting: 'طباعة سريعة',
      fastPrintingDesc: 'يتم طبع كتبك وشحنها في غضون 3 إلى 5 أيام عمل',
      qualityPrint: 'طباعة عالية الجودة',
      qualityPrintDesc: 'ورق عالي الجودة وطباعة احترافية لكل كتاب',
      wideSelection: 'تشكيلة واسعة',
      wideSelectionDesc: 'آلاف العناوين المتوفرة بالفرنسية والعربية والإنجليزية',
      deliveryAcross: 'توصيل لكل الولايات',
      deliveryAcrossDesc: 'توصيل إلى 58 ولاية مع تتبع الطلب',
      howItWorks: 'كيف يعمل ؟',
      step1: 'اختر كتابك',
      step1Desc: 'تصفح كتالوجنا واختر الكتب التي تهمك',
      step2: 'نقوم بطباعته',
      step2Desc: 'يتم طبع كتابك خصيصاً لك بجودة احترافية',
      step3: 'توصيل سريع',
      step3Desc: 'استلم طلبك مباشرة في منزلك أو في مكتب البريد',
      step4: 'استمتع بالقراءة',
      step4Desc: 'استرخِ واستمتع بكتابك الجديد المطبوع حديثاً',
    },
    catalog: {
      filterBy: 'تصفية حسب',
      sortBy: 'ترتيب حسب',
      priceRange: 'نطاق السعر',
      category: 'الفئة',
      author: 'المؤلف',
      language: 'اللغة',
      allCategories: 'جميع الفئات',
      allAuthors: 'جميع المؤلفين',
      allLanguages: 'جميع اللغات',
      resetFilters: 'إعادة تعيين الفلاتر',
      noResults: 'لم يتم العثور على نتائج',
      results: 'نتائج',
      result: 'نتيجة',
      showing: 'عرض',
      of: 'من',
      books: 'كتب',
      sortNewest: 'الأحدث',
      sortOldest: 'الأقدم',
      sortPriceLow: 'السعر: من الأقل',
      sortPriceHigh: 'السعر: من الأعلى',
      sortTitleAZ: 'العنوان: أ-ي',
      sortTitleZA: 'العنوان: ي-أ',
      minPrice: 'الحد الأدنى للسعر',
      maxPrice: 'الحد الأقصى للسعر',
      apply: 'تطبيق',
      clearAll: 'مسح الكل',
      activeFilters: 'الفلاتر النشطة',
      availableOnly: 'المتوفر فقط',
      inStock: 'متوفر',
    },
    book: {
      title: 'العنوان',
      author: 'المؤلف',
      description: 'الوصف',
      publisher: 'الناشر',
      pages: 'الصفحات',
      isbn: 'ردمك',
      language: 'اللغة',
      price: 'السعر',
      printDelay: 'مدة الطباعة',
      addToCart: 'أضف إلى السلة',
      printOnDemandNote: 'هذا الكتاب مطبوع عند الطلب. مدة الطباعة المقدرة:',
      available: 'متوفر',
      unavailable: 'غير متوفر',
      outOfStock: 'نفذ المخزون',
      details: 'التفاصيل',
      specifications: 'المواصفات',
      relatedBooks: 'كتب مشابهة',
      quantity: 'الكمية',
      addedToCart: 'تمت الإضافة إلى السلة',
      goCheck: 'عرض السلة',
      backToCatalog: 'العودة إلى الكتالوج',
      share: 'مشاركة',
      category: 'الفئة',
      publishDate: 'تاريخ النشر',
      format: 'التنسيق',
      paperback: 'غلاف عادي',
      aboutAuthor: 'حول المؤلف',
    },
    cart: {
      yourCart: 'سلتك',
      empty: 'سلتك فارغة',
      emptyDesc: 'تصفح كتالوجنا للعثور على كتب تعجبك',
      total: 'المجموع',
      subtotal: 'المجموع الفرعي',
      proceedToCheckout: 'إتمام الطلب',
      remove: 'حذف',
      quantity: 'الكمية',
      continueShopping: 'مواصلة التسوق',
      updateQuantity: 'تحديث الكمية',
      itemAdded: 'تمت إضافة العنصر إلى السلة',
      itemRemoved: 'تم حذف العنصر من السلة',
      orderSummary: 'ملخص الطلب',
      shippingNote: 'سيتم حساب رسوم الشحن في الخطوة التالية',
      freeShipping: 'شحن مجاني ابتداءً من',
      items: 'عناصر',
      item: 'عنصر',
    },
    checkout: {
      fullName: 'الاسم الكامل',
      phone: 'الهاتف',
      wilaya: 'الولاية',
      commune: 'البلدية',
      address: 'العنوان',
      note: 'ملاحظة (اختياري)',
      placeOrder: 'تأكيد الطلب',
      orderSummary: 'ملخص الطلب',
      paymentMethod: 'طريقة الدفع',
      cashOnDelivery: 'الدفع عند الاستلام',
      orderSuccess: 'تم تأكيد الطلب !',
      orderNumber: 'رقم الطلب',
      orderPlaced: 'تم تقديم الطلب',
      orderConfirmed: 'تم تأكيد الطلب',
      thankYou: 'شكراً لطلبك !',
      orderDetails: 'تفاصيل الطلب',
      shippingInfo: 'معلومات الشحن',
      contactInfo: 'معلومات الاتصال',
      reviewOrder: 'مراجعة الطلب',
      termsAccept: 'أوافق على الشروط العامة للبيع',
      requiredField: 'هذا الحقل مطلوب',
      invalidPhone: 'رقم الهاتف غير صالح',
      invalidName: 'الاسم غير صالح',
      confirmOrder: 'تأكيد الطلب',
      yourInformation: 'معلوماتك',
      deliveryInfo: 'معلومات التوصيل',
      paymentInfo: 'معلومات الدفع',
      codDescription: 'ستدفع نقداً عند استلام طلبك',
      estimatedDelivery: 'التوصيل المقدر',
      backToCart: 'العودة إلى السلة',
    },
    orderStatus: {
      nouvelle: 'جديدة',
      confirmee: 'مؤكدة',
      en_impression: 'قيد الطباعة',
      prete_a_livrer: 'جاهزة للتوصيل',
      expediee: 'تم الشحن',
      livree: 'تم التوصيل',
      annulee: 'ملغاة',
    },
    orderSuccess: {
      title: 'تم تأكيد الطلب !',
      subtitle: 'تم تسجيل طلبك بنجاح',
      orderNumber: 'رقم الطلب',
      orderDate: 'تاريخ الطلب',
      status: 'الحالة',
      continueShopping: 'مواصلة التسوق',
      trackOrder: 'تتبع الطلب',
      estimatedDelivery: 'التوصيل المقدر خلال 5-7 أيام عمل',
      thankYou: 'شكراً لثقتكم !',
      confirmationSent: 'تم إرسال رسالة تأكيد إلى رقم هاتفك',
    },
    admin: {
      dashboard: 'لوحة التحكم',
      manageBooks: 'إدارة الكتب',
      manageOrders: 'إدارة الطلبات',
      manageCategories: 'إدارة الفئات',
      importISBN: 'استيراد ردمك',
      socialMedia: 'وسائل التواصل',
      addBook: 'إضافة كتاب',
      editBook: 'تعديل الكتاب',
      publish: 'نشر',
      unpublish: 'إلغاء النشر',
      delete: 'حذف',
      totalBooks: 'مجموع الكتب',
      totalOrders: 'مجموع الطلبات',
      totalRevenue: 'إجمالي الإيرادات',
      totalCategories: 'مجموع الفئات',
      recentOrders: 'الطلبات الأخيرة',
      quickActions: 'إجراءات سريعة',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      loginTitle: 'تسجيل دخول المدير',
      loginSubtitle: 'أدخل بياناتك للوصول إلى لوحة الإدارة',
      loginError: 'بيانات الدخول غير صحيحة',
      welcome: 'مرحباً',
      overview: 'نظرة عامة',
      statistics: 'الإحصائيات',
      bookManagement: 'إدارة الكتب',
      orderManagement: 'إدارة الطلبات',
      categoryManagement: 'إدارة الفئات',
      isbnImport: 'استيراد ردمك',
      socialMediaManagement: 'إدارة وسائل التواصل',
      published: 'منشور',
      draft: 'مسودة',
      all: 'الكل',
      searchBooks: 'البحث عن كتب...',
      noBooks: 'لم يتم العثور على كتب',
      confirmDelete: 'تأكيد الحذف',
      confirmDeleteDesc: 'هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد من حذف هذا العنصر ؟',
      bulkActions: 'إجراءات جماعية',
      export: 'تصدير',
      filterStatus: 'تصفية حسب الحالة',
      ordersToday: 'طلبات اليوم',
      pendingOrders: 'طلبات قيد الانتظار',
      completedOrders: 'طلبات مكتملة',
      cancelledOrders: 'طلبات ملغاة',
      revenue: 'الإيرادات',
      averageOrder: 'متوسط الطلب',
      topBooks: 'الكتب الأكثر مبيعاً',
      orderDetails: 'تفاصيل الطلب',
      updateStatus: 'تحديث الحالة',
      customerInfo: 'معلومات العميل',
      orderItems: 'المنتجات المطلوبة',
      isbnInput: 'رقم ردمك',
      isbnPlaceholder: 'أدخل ردمك الكتاب (مثال: 978-2-1234-5678-9)',
      importButton: 'استيراد',
      importSuccess: 'تم استيراد الكتاب بنجاح',
      importError: 'خطأ أثناء الاستيراد',
      fetchingBook: 'جارٍ استرجاع معلومات الكتاب...',
      autoFill: 'تعبئة تلقائية',
      coverImage: 'صورة الغلاف',
      categorySlug: 'الفئة (slug)',
      priceSale: 'سعر البيع',
      pricePrint: 'سعر الطباعة',
      margin: 'الهامش',
      printDelay: 'مدة الطباعة',
      isAvailable: 'متوفر',
      isDraft: 'مسودة',
      isPublished: 'منشور',
      bulkImport: 'استيراد جماعي',
      isbnListLabel: 'قائمة ردمك (واحد في كل سطر)',
      importAll: 'استيراد الكل',
      saveBook: 'حفظ الكتاب',
      updateBook: 'تحديث الكتاب',
      addCategory: 'إضافة فئة',
      categoryNameFr: 'الاسم (فرنسي)',
      categoryNameAr: 'الاسم (عربي)',
      categoryNameEn: 'الاسم (إنجليزي)',
      categorySlug: 'الرابط',
      editCategory: 'تعديل الفئة',
      deleteCategory: 'حذف الفئة',
      socialPlatform: 'المنصة',
      postContent: 'محتوى المنشور',
      schedulePost: 'جدولة النشر',
      publishNow: 'نشر الآن',
      facebook: 'فيسبوك',
      instagram: 'إنستغرام',
      postStatus: 'حالة المنشور',
      brouillon: 'مسودة',
      programmee: 'مجدول',
      publiee: 'منشور',
      echouee: 'فشل',
    },
    common: {
      loading: 'جارٍ التحميل...',
      error: 'خطأ',
      save: 'حفظ',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      delete: 'حذف',
      edit: 'تعديل',
      view: 'عرض',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      of: 'من',
      searchPlaceholder: 'بحث...',
      noResults: 'لا توجد نتائج',
      close: 'إغلاق',
      actions: 'إجراءات',
      status: 'الحالة',
      date: 'التاريخ',
      amount: 'المبلغ',
      name: 'الاسم',
      description: 'الوصف',
      image: 'الصورة',
      createdAt: 'تاريخ الإنشاء',
      updatedAt: 'تاريخ التحديث',
      yes: 'نعم',
      no: 'لا',
      or: 'أو',
      and: 'و',
      all: 'الكل',
      selected: 'محدد',
      none: 'لا شيء',
      required: 'مطلوب',
      optional: 'اختياري',
      success: 'نجاح',
      warning: 'تحذير',
      info: 'معلومة',
      danger: 'خطر',
      tryAgain: 'حاول مرة أخرى',
      goToHome: 'العودة إلى الرئيسية',
      page: 'الصفحة',
      perPage: 'في كل صفحة',
      showing: 'عرض',
      total: 'المجموع',
      more: 'المزيد',
      less: 'أقل',
      showMore: 'عرض المزيد',
      showLess: 'عرض أقل',
      currency: 'د.ج',
      da: 'د.ج',
    },
    footer: {
      about: 'عن كتبي',
      aboutDesc: 'كتبي هي مكتبتك الإلكترونية المتخصصة في الطباعة عند الطلب. نقدم تشكيلة واسعة من الكتب بالفرنسية والعربية والإنجليزية، مطبوعة بعناية وموصلة إلى كل ولايات الجزائر.',
      quickLinks: 'روابط سريعة',
      contactUs: 'اتصل بنا',
      followUs: 'تابعنا',
      rights: 'جميع الحقوق محفوظة',
      privacy: 'سياسة الخصوصية',
      terms: 'شروط الاستخدام',
      faq: 'الأسئلة الشائعة',
      contact: 'اتصل',
      email: 'contact@kitabi.dz',
      phone: '+213 XXX XXX XXX',
      address: 'الجزائر العاصمة، الجزائر',
    },
    errors: {
      notFound: 'الصفحة غير موجودة',
      notFoundDesc: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
      serverError: 'خطأ في الخادم',
      serverErrorDesc: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
      networkError: 'خطأ في الشبكة',
      networkErrorDesc: 'لا يمكن الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
      unauthorized: 'غير مصرح',
      unauthorizedDesc: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.',
      forbidden: 'وصول ممنوع',
      forbiddenDesc: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.',
    },
  },

  en: {
    nav: {
      home: 'Home',
      catalog: 'Catalog',
      cart: 'Cart',
      admin: 'Admin',
      search: 'Search',
      language: 'Language',
      bookDetail: 'Book Detail',
      checkout: 'Checkout',
      orderSuccess: 'Order Confirmed',
      orders: 'Orders',
    },
    home: {
      heroTitle: 'Your Online Bookstore, Printed on Demand',
      heroSubtitle: 'Discover thousands of books, printed specially for you and delivered across Algeria',
      featuredBooks: 'Featured Books',
      browseCategories: 'Browse Categories',
      printOnDemand: 'Print on Demand',
      printOnDemandDesc: 'Every book is printed specially for you',
      newArrivals: 'New Arrivals',
      bestSellers: 'Best Sellers',
      viewAll: 'View All',
      exploreCatalog: 'Explore Catalog',
      whyKitabi: 'Why Kitabi?',
      fastPrinting: 'Fast Printing',
      fastPrintingDesc: 'Your books are printed and shipped within 3-5 business days',
      qualityPrint: 'Quality Printing',
      qualityPrintDesc: 'High-quality paper and professional printing for every book',
      wideSelection: 'Wide Selection',
      wideSelectionDesc: 'Thousands of titles available in French, Arabic, and English',
      deliveryAcross: 'Delivery Across Algeria',
      deliveryAcrossDesc: 'Delivery to all 58 wilayas with order tracking',
      howItWorks: 'How It Works',
      step1: 'Choose Your Book',
      step1Desc: 'Browse our catalog and select the books that interest you',
      step2: 'We Print It',
      step2Desc: 'Your book is printed specially for you with professional quality',
      step3: 'Fast Delivery',
      step3Desc: 'Receive your order directly at your home or post office',
      step4: 'Enjoy Reading',
      step4Desc: 'Relax and enjoy your freshly printed new book',
    },
    catalog: {
      filterBy: 'Filter By',
      sortBy: 'Sort By',
      priceRange: 'Price Range',
      category: 'Category',
      author: 'Author',
      language: 'Language',
      allCategories: 'All Categories',
      allAuthors: 'All Authors',
      allLanguages: 'All Languages',
      resetFilters: 'Reset Filters',
      noResults: 'No results found',
      results: 'results',
      result: 'result',
      showing: 'Showing',
      of: 'of',
      books: 'books',
      sortNewest: 'Newest',
      sortOldest: 'Oldest',
      sortPriceLow: 'Price: Low to High',
      sortPriceHigh: 'Price: High to Low',
      sortTitleAZ: 'Title: A-Z',
      sortTitleZA: 'Title: Z-A',
      minPrice: 'Min Price',
      maxPrice: 'Max Price',
      apply: 'Apply',
      clearAll: 'Clear All',
      activeFilters: 'Active Filters',
      availableOnly: 'Available Only',
      inStock: 'In Stock',
    },
    book: {
      title: 'Title',
      author: 'Author',
      description: 'Description',
      publisher: 'Publisher',
      pages: 'Pages',
      isbn: 'ISBN',
      language: 'Language',
      price: 'Price',
      printDelay: 'Print Delay',
      addToCart: 'Add to Cart',
      printOnDemandNote: 'This book is printed on demand. Estimated print delay:',
      available: 'Available',
      unavailable: 'Unavailable',
      outOfStock: 'Out of Stock',
      details: 'Details',
      specifications: 'Specifications',
      relatedBooks: 'Related Books',
      quantity: 'Quantity',
      addedToCart: 'Added to cart',
      goCheck: 'View cart',
      backToCatalog: 'Back to catalog',
      share: 'Share',
      category: 'Category',
      publishDate: 'Publish Date',
      format: 'Format',
      paperback: 'Paperback',
      aboutAuthor: 'About the Author',
    },
    cart: {
      yourCart: 'Your Cart',
      empty: 'Your cart is empty',
      emptyDesc: 'Browse our catalog to find books you like',
      total: 'Total',
      subtotal: 'Subtotal',
      proceedToCheckout: 'Proceed to Checkout',
      remove: 'Remove',
      quantity: 'Quantity',
      continueShopping: 'Continue Shopping',
      updateQuantity: 'Update quantity',
      itemAdded: 'Item added to cart',
      itemRemoved: 'Item removed from cart',
      orderSummary: 'Order Summary',
      shippingNote: 'Shipping costs calculated at the next step',
      freeShipping: 'Free shipping from',
      items: 'items',
      item: 'item',
    },
    checkout: {
      fullName: 'Full Name',
      phone: 'Phone',
      wilaya: 'Wilaya',
      commune: 'Commune',
      address: 'Address',
      note: 'Note (optional)',
      placeOrder: 'Place Order',
      orderSummary: 'Order Summary',
      paymentMethod: 'Payment Method',
      cashOnDelivery: 'Cash on Delivery',
      orderSuccess: 'Order Confirmed!',
      orderNumber: 'Order Number',
      orderPlaced: 'Order Placed',
      orderConfirmed: 'Order Confirmed',
      thankYou: 'Thank you for your order!',
      orderDetails: 'Order Details',
      shippingInfo: 'Shipping Information',
      contactInfo: 'Contact Information',
      reviewOrder: 'Review Order',
      termsAccept: 'I accept the general terms of sale',
      requiredField: 'This field is required',
      invalidPhone: 'Invalid phone number',
      invalidName: 'Invalid name',
      confirmOrder: 'Confirm Order',
      yourInformation: 'Your Information',
      deliveryInfo: 'Delivery Information',
      paymentInfo: 'Payment Information',
      codDescription: 'You will pay in cash upon receiving your order',
      estimatedDelivery: 'Estimated Delivery',
      backToCart: 'Back to Cart',
    },
    orderStatus: {
      nouvelle: 'New',
      confirmee: 'Confirmed',
      en_impression: 'Printing',
      prete_a_livrer: 'Ready to Ship',
      expediee: 'Shipped',
      livree: 'Delivered',
      annulee: 'Cancelled',
    },
    orderSuccess: {
      title: 'Order Confirmed!',
      subtitle: 'Your order has been successfully placed',
      orderNumber: 'Order Number',
      orderDate: 'Order Date',
      status: 'Status',
      continueShopping: 'Continue Shopping',
      trackOrder: 'Track Order',
      estimatedDelivery: 'Estimated delivery in 5-7 business days',
      thankYou: 'Thank you for your trust!',
      confirmationSent: 'A confirmation SMS has been sent to your number',
    },
    admin: {
      dashboard: 'Dashboard',
      manageBooks: 'Manage Books',
      manageOrders: 'Manage Orders',
      manageCategories: 'Manage Categories',
      importISBN: 'Import ISBN',
      socialMedia: 'Social Media',
      addBook: 'Add Book',
      editBook: 'Edit Book',
      publish: 'Publish',
      unpublish: 'Unpublish',
      delete: 'Delete',
      totalBooks: 'Total Books',
      totalOrders: 'Total Orders',
      totalRevenue: 'Total Revenue',
      totalCategories: 'Total Categories',
      recentOrders: 'Recent Orders',
      quickActions: 'Quick Actions',
      login: 'Login',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      loginTitle: 'Admin Login',
      loginSubtitle: 'Enter your credentials to access the admin panel',
      loginError: 'Invalid credentials',
      welcome: 'Welcome',
      overview: 'Overview',
      statistics: 'Statistics',
      bookManagement: 'Book Management',
      orderManagement: 'Order Management',
      categoryManagement: 'Category Management',
      isbnImport: 'ISBN Import',
      socialMediaManagement: 'Social Media Management',
      published: 'Published',
      draft: 'Draft',
      all: 'All',
      searchBooks: 'Search books...',
      noBooks: 'No books found',
      confirmDelete: 'Confirm Deletion',
      confirmDeleteDesc: 'This action is irreversible. Are you sure you want to delete this item?',
      bulkActions: 'Bulk Actions',
      export: 'Export',
      filterStatus: 'Filter by Status',
      ordersToday: 'Orders Today',
      pendingOrders: 'Pending Orders',
      completedOrders: 'Completed Orders',
      cancelledOrders: 'Cancelled Orders',
      revenue: 'Revenue',
      averageOrder: 'Average Order',
      topBooks: 'Top Selling Books',
      orderDetails: 'Order Details',
      updateStatus: 'Update Status',
      customerInfo: 'Customer Info',
      orderItems: 'Order Items',
      isbnInput: 'ISBN Number',
      isbnPlaceholder: 'Enter the book ISBN (e.g.: 978-2-1234-5678-9)',
      importButton: 'Import',
      importSuccess: 'Book imported successfully',
      importError: 'Error during import',
      fetchingBook: 'Fetching book information...',
      autoFill: 'Auto Fill',
      coverImage: 'Cover Image',
      categorySlug: 'Category (slug)',
      priceSale: 'Sale Price',
      pricePrint: 'Print Price',
      margin: 'Margin',
      printDelay: 'Print Delay',
      isAvailable: 'Available',
      isDraft: 'Draft',
      isPublished: 'Published',
      bulkImport: 'Bulk Import',
      isbnListLabel: 'ISBN list (one per line)',
      importAll: 'Import All',
      saveBook: 'Save Book',
      updateBook: 'Update Book',
      addCategory: 'Add Category',
      categoryNameFr: 'Name (French)',
      categoryNameAr: 'Name (Arabic)',
      categoryNameEn: 'Name (English)',
      categorySlug: 'Slug',
      editCategory: 'Edit Category',
      deleteCategory: 'Delete Category',
      socialPlatform: 'Platform',
      postContent: 'Post Content',
      schedulePost: 'Schedule Post',
      publishNow: 'Publish Now',
      facebook: 'Facebook',
      instagram: 'Instagram',
      postStatus: 'Post Status',
      brouillon: 'Draft',
      programmee: 'Scheduled',
      publiee: 'Published',
      echouee: 'Failed',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      of: 'of',
      searchPlaceholder: 'Search...',
      noResults: 'No results',
      close: 'Close',
      actions: 'Actions',
      status: 'Status',
      date: 'Date',
      amount: 'Amount',
      name: 'Name',
      description: 'Description',
      image: 'Image',
      createdAt: 'Created at',
      updatedAt: 'Updated at',
      yes: 'Yes',
      no: 'No',
      or: 'or',
      and: 'and',
      all: 'All',
      selected: 'selected',
      none: 'None',
      required: 'Required',
      optional: 'Optional',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      danger: 'Danger',
      tryAgain: 'Try Again',
      goToHome: 'Go to Home',
      page: 'Page',
      perPage: 'Per page',
      showing: 'Showing',
      total: 'Total',
      more: 'More',
      less: 'Less',
      showMore: 'Show More',
      showLess: 'Show Less',
      currency: 'DZD',
      da: 'DZD',
    },
    footer: {
      about: 'About Kitabi',
      aboutDesc: 'Kitabi is your online bookstore specializing in print-on-demand. We offer a wide selection of books in French, Arabic, and English, printed with care and delivered across Algeria.',
      quickLinks: 'Quick Links',
      contactUs: 'Contact Us',
      followUs: 'Follow Us',
      rights: 'All rights reserved',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use',
      faq: 'FAQ',
      contact: 'Contact',
      email: 'contact@kitabi.dz',
      phone: '+213 XXX XXX XXX',
      address: 'Algiers, Algeria',
    },
    errors: {
      notFound: 'Page Not Found',
      notFoundDesc: 'The page you are looking for does not exist or has been moved.',
      serverError: 'Server Error',
      serverErrorDesc: 'An error occurred on the server. Please try again later.',
      networkError: 'Network Error',
      networkErrorDesc: 'Unable to connect to the server. Check your internet connection.',
      unauthorized: 'Unauthorized',
      unauthorizedDesc: 'You must be logged in to access this page.',
      forbidden: 'Forbidden',
      forbiddenDesc: 'You do not have the necessary permissions to access this page.',
    },
  },
}

export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : never
    }[keyof T & string]
  : never

export type TranslationKey = NestedKeyOf<TranslationKeys>

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return path // fallback to key path
    }
  }
  return typeof current === 'string' ? current : path
}

export function t(key: TranslationKey | string, lang: Language): string {
  return getNestedValue(translations[lang] as unknown as Record<string, unknown>, key)
}

export function useTranslation() {
  const language = useLanguageStore((s) => s.language)

  const currentTranslations = translations[language]

  // Memoize the translate function to keep a stable reference across renders
  // Only recreate when language changes (which is the only thing that affects output)
  const translate = useMemo(() => {
    const fn = ((key: TranslationKey | string): string => {
      return t(key, language)
    }) as TranslationKeys & ((key: TranslationKey | string) => string)

    // Copy all translation sections to the function object
    Object.assign(fn, currentTranslations)

    return fn
  }, [language, currentTranslations])

  return { t: translate, language, isRTL: language === 'ar' }
}

export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

export function getFontClass(lang: Language): string {
  return lang === 'ar' ? 'font-arabic' : 'font-sans'
}

export const RTL_LANGUAGES: Language[] = ['ar']
export const AVAILABLE_LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
]

export { translations }
