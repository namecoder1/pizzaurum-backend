import { server } from "../../lib/fastify.js";
import { client } from "../../lib/sanity.js";
import { requireField } from "../../utils/errors.js";
import { cleanObjectStrings } from "../../utils/sanity.js";

server.get('/api/sanity/featured', async (req, res) => {
  const data = await client.fetch(`
    *[isFeatured == true] {
      'id': _id, 
      name,
      'type': _type,
      description,
      price,
      'image': image.asset -> url,
      category,
      isMonthlyPizza
    }`);

  return cleanObjectStrings(data);
})

server.get('/api/sanity/monthly', async (req, res) => {
  const data = await client.fetch(`
    *[_type == "pizzaurum" && isMonthlyPizza == true] [0] {
      'id': _id, 
      name,
      description,
      category,
      price,
      'image': image.asset -> url
    }`)

  return cleanObjectStrings(data)
})

server.get('/api/sanity/customizations', async (req, res) => {
  const data = await client.fetch(`
    *[_type == 'customization'] | order(created_at desc) {
      'id': _id,
      category,
      name,
      price
    }`)

  return (cleanObjectStrings(data))
})

server.get('/api/sanity/pizzas', async (req, res) => {
  const data = await client.fetch(`
    *[_type == "pizza"] {
      'id': _id, 
      'type': _type,
      name,
      description,
      price,
      'image': image.asset -> url,
      category
  }`);

  return cleanObjectStrings(data);
})

server.get('/api/sanity/pizzaurums', async (req, res) => {
  const data = await client.fetch(`
    *[_type == "pizzaurum"] {
      'id': _id, 
      'type': _type,
      name,
      description,
      isMonthlyPizza,
      price,
      'image': image.asset -> url,
      category
  }`);

  return cleanObjectStrings(data);
})

server.get('/api/sanity/drinks', async (req, res) => {
  const data = await client.fetch(`
    *[_type == "drink"] {
      'id': _id, 
      'type': _type,
      name,
      description,
      price,
      'image': image.asset -> url,
  }`);

  return cleanObjectStrings(data);
})

server.get('/api/sanity/others', async (req, res) => {
  const data = await client.fetch(`
    *[_type == "other"] {
      'id': _id, 
      'type': _type,
      name,
      description,
      price,
      'image': image.asset -> url,
      category
    }`);

  return cleanObjectStrings(data);
})

server.get('/api/sanity/product/:id', async (req, res) => {
  const { id } = req.params as { id: string };
  requireField(id, 'Product ID is required');
  if (!id) return res.status(400).send({ error: 'Product ID is required' });

  const data = await client.fetch(`
    *[_id == $id] [0] {
    'id': _id,
    name,
    description,
    price,
    'image': image.asset -> url,
    category
  }`, { id: id});

  return cleanObjectStrings(data);
})

server.get('/api/sanity/spianatas', async (req, res) => {
  const data = await client.fetch(`
    *[_type == "spianata"] {
    'id':_id,
    'type': _type,
    name,
    description,
    'price': basePrice,
    'isSpecial': pizzaFarcita,
    "image": image.asset->url,
    toppings[] {
      name,
      additionalPrice,
      description
    }
  }`);

  return cleanObjectStrings(data);
})

server.get('/api/sanity/opendays', async (req, res) => {
  const data = await client.fetch(`
    *[_type == "openDays"] {
    'id': _id,
    day,
    isOpen,
    timeSlots[] {
      openTime,
      closeTime
    }
  }`)

  return cleanObjectStrings(data);
})



