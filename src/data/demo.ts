export type Category = { slug: string; name: string; description: string; image: string }
export type Variant = { name: string; price: number }
export type Product = { slug: string; name: string; category: string; description: string; price: number; image: string; badge?: string; variants?: Variant[]; ingredients?: string[] }

const cake = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80'
const pastry = 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80'
const sweets = 'https://images.unsplash.com/photo-1605196560541-1f8b0a4f3b7f?auto=format&fit=crop&w=900&q=80'
const bread = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80'

export const categories: Category[] = [
  { slug: 'birthday-cakes', name: 'Birthday Cakes', description: 'Celebration-ready cakes for memorable moments.', image: cake },
  { slug: 'designer-cakes', name: 'Designer Cakes', description: 'Elegant statement cakes with room for your idea.', image: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=900&q=80' },
  { slug: 'sweets', name: 'Sweets', description: 'Classic Indian sweets for gifting and gatherings.', image: sweets },
  { slug: 'pastries', name: 'Pastries', description: 'Small indulgences for tea-time and beyond.', image: pastry },
  { slug: 'breads', name: 'Breads', description: 'Everyday bakery favourites.', image: bread },
  { slug: 'gift-hampers', name: 'Gift Hampers', description: 'Thoughtful assortments for sweet occasions.', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=80' },
]

export const products: Product[] = [
  { slug: 'classic-black-forest', name: 'Classic Black Forest', category: 'birthday-cakes', description: 'A rich chocolate-and-cherry inspired celebration cake. SAMPLE.', price: 699, image: cake, badge: 'DEMO', variants: [{ name: '500g', price: 499 }, { name: '1kg', price: 699 }, { name: '2kg', price: 1299 }], ingredients: ['Wheat flour', 'Cocoa', 'Cream', 'Sugar'] },
  { slug: 'chocolate-truffle', name: 'Chocolate Truffle', category: 'birthday-cakes', description: 'Deep chocolate layers finished with a smooth ganache. SAMPLE.', price: 799, image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=900&q=80', badge: 'DEMO', variants: [{ name: '500g', price: 549 }, { name: '1kg', price: 799 }, { name: '2kg', price: 1499 }] },
  { slug: 'vanilla-celebration', name: 'Vanilla Celebration', category: 'birthday-cakes', description: 'Light vanilla layers with a clean celebration finish. SAMPLE.', price: 599, image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80', badge: 'DEMO', variants: [{ name: '500g', price: 399 }, { name: '1kg', price: 599 }] },
  { slug: 'red-velvet', name: 'Red Velvet', category: 'designer-cakes', description: 'Velvety cocoa cake with a creamy finish. SAMPLE.', price: 899, image: 'https://images.unsplash.com/photo-1586788224331-947f68671cf0?auto=format&fit=crop&w=900&q=80', badge: 'DEMO', variants: [{ name: '1kg', price: 899 }, { name: '2kg', price: 1699 }] },
  { slug: 'assorted-pastry-box', name: 'Assorted Pastry Box', category: 'pastries', description: 'A mixed selection of petite bakery treats. SAMPLE.', price: 399, image: pastry, badge: 'DEMO' },
  { slug: 'chocolate-pastry', name: 'Chocolate Pastry', category: 'pastries', description: 'A soft chocolate pastry for a quick sweet break. SAMPLE.', price: 99, image: pastry, badge: 'DEMO' },
  { slug: 'motichoor-ladoo', name: 'Motichoor Ladoo', category: 'sweets', description: 'A festive Indian sweet concept for the demo catalogue. SAMPLE.', price: 280, image: sweets, badge: 'DEMO' },
  { slug: 'kaju-katli', name: 'Kaju Katli', category: 'sweets', description: 'Delicate cashew fudge-style sweet. SAMPLE.', price: 420, image: sweets, badge: 'DEMO' },
  { slug: 'milk-bread', name: 'Milk Bread', category: 'breads', description: 'Soft everyday bread concept. SAMPLE.', price: 70, image: bread, badge: 'DEMO' },
  { slug: 'gift-sweet-box', name: 'Sweet Celebration Box', category: 'gift-hampers', description: 'A configurable gifting assortment. SAMPLE.', price: 599, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=80', badge: 'DEMO' },
]

export const gallery = [
  { src: cake, alt: 'Chocolate celebration cake, demo image', caption: 'Celebration cakes · SAMPLE' },
  { src: pastry, alt: 'Fresh bakery pastries, demo image', caption: 'Bakery favourites · SAMPLE' },
  { src: sweets, alt: 'Indian sweets assortment, demo image', caption: 'Sweet moments · SAMPLE' },
  { src: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=1200&q=80', alt: 'Decorated designer cake, demo image', caption: 'Custom cake inspiration · SAMPLE' },
]

export const reviews = [
  { name: 'Sample customer', rating: 5, comment: 'Demo testimonial — replace with a verified customer review before launch.' },
  { name: 'Sample customer', rating: 5, comment: 'Demo testimonial — replace with a verified customer review before launch.' },
]
