
import React from 'react';
import { Package, Calendar, CreditCard } from 'lucide-react';
import { Order } from '../types';

interface OrderHistoryProps {
  orders: Order[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders }) => {
  if (orders.length === 0) {
    return (
      <section className="py-16 bg-white/50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-8">
            Order History
          </h2>
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No orders yet</p>
            <p className="text-gray-400">Your order history will appear here</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white/50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-12">
          Your Order History
        </h2>
        
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Order Header */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Package className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Order #{order.id}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{order.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">৳{order.total}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <CreditCard className="h-4 w-4" />
                      <span>{order.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Items Ordered</h4>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{item.name}</span>
                        <span className="text-gray-500 ml-2">× {item.quantity}</span>
                      </div>
                      <div className="font-semibold text-green-600">
                        ৳{item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Details */}
                {(order.address || order.phone || order.transactionId) && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h5 className="font-semibold text-gray-800 mb-3">Order Details</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {order.phone && (
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <span className="ml-2 font-medium">{order.phone}</span>
                        </div>
                      )}
                      {order.transactionId && (
                        <div>
                          <span className="text-gray-600">Transaction ID:</span>
                          <span className="ml-2 font-medium">{order.transactionId}</span>
                        </div>
                      )}
                      {order.address && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-600">Address:</span>
                          <span className="ml-2 font-medium">{order.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OrderHistory;
