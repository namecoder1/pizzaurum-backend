'use server';
import groq from "groq";
export const FEATURED_PIZZAS_QUERY = groq `
  *[isFeatured == true] {
    'id': _id, 
    name,
    description,
    price,
    'image': image.asset -> url,
    category,
    isMonthlyPizza
  }
`;
export const PIZZAS_QUERY = groq `
  *[_type == "pizza"] {
    'id': _id, 
    'type': _type,
    name,
    description,
    price,
    'image': image.asset -> url,
    category
  }
`;
export const PIZZAURUMS_QUERY = groq `
  *[_type == "pizzaurum"] {
    'id': _id, 
    'type': _type,
    name,
    description,
    price,
    'image': image.asset -> url,
    category,
    isMonthlyPizza
  }
`;
export const DRINKS_QUERY = groq `
  *[_type == "drink"] {
    'id': _id, 
    'type': _type,
    name,
    description,
    price,
    'image': image.asset -> url,
    category
  }
`;
export const OTHERS_QUERY = groq `
  *[_type == "other"] {
    'id': _id, 
    'type': _type,
    name,
    description,
    price,
    'image': image.asset -> url,
    category
  }
`;
export const MONTHLY_PIZZA_QUERY = groq `
  *[_type == "pizzaurum" && isMonthlyPizza == true] {
    'id': _id, 
    name,
    description,
    category,
    price,
    'image': image.asset -> url
  }
`;
export const ORDER_QUERY = groq `
  *[_type == "order" && id == $id] {
    'id': _id,
    price,
    status,
    created_at,
    products[]->{
      product_id,
      quantity,
      extras[]->{
        name,
        price
      }
    }
  }
`;
export const PRODUCT_BY_ID_QUERY = groq `
  *[_id == $id] {
    'id': _id,
    name,
    description,
    price,
    'image': image.asset -> url,
    category
  }
`;
export const SPIANATAS_QUERY = groq `
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
  }
`;
export const OPENDAYS_QUERY = groq `
  *[_type == "openDays"] {
    'id': _id,
    day,
    isOpen,
    timeSlots[] {
      openTime,
      closeTime
    }
  }
`;
//# sourceMappingURL=queries.js.map