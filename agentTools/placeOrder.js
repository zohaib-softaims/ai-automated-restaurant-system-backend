import { tool } from '@langchain/core/tools';
import Order from '../models/OrderModel.js';
import Product from '../models/ProductModel.js';
import Deal from '../models/DealsModel.js';
export const placeOrder = tool(
  async ({ customerName, contactNumber, address, products, deals, paymentMethod }) => {
    try {
      const newOrder = new Order({
        customerName,
        contactNumber,
        address,
        products,
        deals,
        paymentMethod
      });

      let totalAmount = 0;
      const productIds = products.map((item) => item.product);
      const productDetails = await Product.find({ '_id': { $in: productIds } });
      products.forEach((item) => {
        const product = productDetails.find((prod) => prod._id.toString() === item.product);
        if (product) {
          totalAmount += product.price * item.quantity;
        }
      });
      const dealIds = deals.map((item) => item.deal);
      const dealDetails = await Deal.find({ '_id': { $in: dealIds } });
      deals.forEach((item) => {
        const deal = dealDetails.find((d) => d._id.toString() === item.deal);
        if (deal) {
          totalAmount += deal.price * item.quantity;
        }
      });
      newOrder.totalAmount=totalAmount

      const savedOrder = await newOrder.save();
      return `Order placed successfully! Order ID: ${savedOrder._id} and total pice: ${savedOrder.totalAmount}`;
    } catch (error) {
      return `Error placing order: ${error.message}`;
    }
  },
  {
    name: 'placeOrder',
    description: 'Place a new food order containing products and deals.',
    schema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', description: 'Name of the customer' },
        contactNumber: { type: 'string', description: 'Contact phone number' },
        address: { type: 'string', description: 'Delivery address' },
        products: {
          type: 'array',
          description: 'List of products with quantities',
          items: {
            type: 'object',
            properties: {
              product: { type: 'string', description: 'Product ObjectId' },
              quantity: { type: 'number', description: 'Quantity of the product' }
            },
            required: ['product', 'quantity']
          }
        },
        deals: {
          type: 'array',
          description: 'List of deals with quantities',
          items: {
            type: 'object',
            properties: {
              deal: { type: 'string', description: 'Deal ObjectId' },
              quantity: { type: 'number', description: 'Quantity of the deal' }
            },
            required: ['deal', 'quantity']
          }
        },
        paymentMethod: {
          type: 'string',
          enum: ['cash', 'card', 'online'],
          description: 'Payment method for the order'
        }
      },
      required: ['customerName', 'contactNumber', 'address', 'products', 'deals', 'paymentMethod']
    }
  }
);
