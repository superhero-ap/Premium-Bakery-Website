-- Demo catalogue seed used by the checkout RPC.
-- The storefront currently renders these sample products locally, so the same
-- slugs and variants must exist in Supabase for server-side order pricing.

insert into public.categories (name,slug,description,image_url,is_active,sort_order)
select * from (values
('Birthday Cakes','birthday-cakes','Celebration-ready cakes for memorable moments.','https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',true,1),
('Designer Cakes','designer-cakes','Elegant statement cakes with room for your idea.','https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=900&q=80',true,2),
('Sweets','sweets','Classic Indian sweets for gifting and gatherings.','https://images.unsplash.com/photo-1605196560541-1f8b0a4f3b7f?auto=format&fit=crop&w=900&q=80',true,3),
('Pastries','pastries','Small indulgences for tea-time and beyond.','https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80',true,4),
('Breads','breads','Everyday bakery favourites.','https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',true,5),
('Gift Hampers','gift-hampers','Thoughtful assortments for sweet occasions.','https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=80',true,6)
) v(name,slug,description,image_url,is_active,sort_order)
where not exists (select 1 from public.categories c where c.slug=v.slug);

insert into public.products (category_id,name,slug,short_description,description,base_price,is_featured,is_best_seller,is_available,is_active,sort_order,stock_quantity,reorder_level)
select c.id,v.name,v.slug,v.description,v.description,v.price,v.featured,v.best_seller,true,true,v.sort_order,100,10
from (values
('birthday-cakes','Classic Black Forest','classic-black-forest','A rich chocolate-and-cherry inspired celebration cake. SAMPLE.',699,true,true,1),
('birthday-cakes','Chocolate Truffle','chocolate-truffle','Deep chocolate layers finished with a smooth ganache. SAMPLE.',799,true,false,2),
('birthday-cakes','Vanilla Celebration','vanilla-celebration','Light vanilla layers with a clean celebration finish. SAMPLE.',599,false,false,3),
('designer-cakes','Red Velvet','red-velvet','Velvety cocoa cake with a creamy finish. SAMPLE.',899,true,false,4),
('pastries','Assorted Pastry Box','assorted-pastry-box','A mixed selection of petite bakery treats. SAMPLE.',399,false,false,5),
('pastries','Chocolate Pastry','chocolate-pastry','A soft chocolate pastry for a quick sweet break. SAMPLE.',99,false,false,6),
('sweets','Motichoor Ladoo','motichoor-ladoo','A festive Indian sweet concept for the demo catalogue. SAMPLE.',280,false,false,7),
('sweets','Kaju Katli','kaju-katli','Delicate cashew fudge-style sweet. SAMPLE.',420,false,false,8),
('breads','Milk Bread','milk-bread','Soft everyday bread concept. SAMPLE.',70,false,false,9),
('gift-hampers','Sweet Celebration Box','gift-sweet-box','A configurable gifting assortment. SAMPLE.',599,false,false,10)
) v(category_slug,name,slug,description,price,featured,best_seller,sort_order)
join public.categories c on c.slug=v.category_slug
where not exists (select 1 from public.products p where p.slug=v.slug);

insert into public.product_variants (product_id,name,price,available,sort_order)
select p.id,v.name,v.price,true,v.sort_order from public.products p join (values
('classic-black-forest','500g',499,1),('classic-black-forest','1kg',699,2),('classic-black-forest','2kg',1299,3),
('chocolate-truffle','500g',549,1),('chocolate-truffle','1kg',799,2),('chocolate-truffle','2kg',1499,3),
('vanilla-celebration','500g',399,1),('vanilla-celebration','1kg',599,2),
('red-velvet','1kg',899,1),('red-velvet','2kg',1699,2)
) v(slug,name,price,sort_order) on p.slug=v.slug
where not exists (select 1 from public.product_variants pv where pv.product_id=p.id and pv.name=v.name);
