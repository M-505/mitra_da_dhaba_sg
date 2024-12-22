'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Card,
  CardBody,
  Stack,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Badge
} from '@chakra-ui/react';

const StatusBadge = ({ status, isMerged }) => {
  const colorScheme = {
    pending: 'yellow',
    confirmed: 'blue',
    preparing: 'purple',
    completed: 'green',
    cancelled: 'red',
    merged: 'gray',
    paid: 'teal'
  }[status];

  return (
    <Badge colorScheme={colorScheme}>
      {isMerged ? 'MERGED' : status.toUpperCase()}
    </Badge>
  );
};

const printReceipt = (order) => {
  const printWindow = window.open('', '_blank');
  const allItems = [...(order.items || []), ...(order.childOrders || []).flatMap(child => child.items || [])];
  const subtotal = parseFloat(order.total_amount || 0);
  const tax = subtotal * 0.09;
  const total = subtotal + tax;
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt - Order #${order.id}</title>
        <style>
          body {
            font-family: monospace;
            font-size: 12px;
            padding: 20px;
            width: 300px;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .mb-2 { margin-bottom: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .border-top { border-top: 1px solid black; padding-top: 8px; }
          .flex { display: flex; justify-content: space-between; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center mb-4">
          <div class="bold">MITRA DA DHABA</div>
          <div>46 Desker Road, #01-01</div>
          <div>Singapore - 209577</div>
          <div>Tel: +65 1234 5678</div>
        </div>

        <div class="flex mb-2">
          <div>Order: #${order.id}</div>
          <div>${new Date().toLocaleString()}</div>
        </div>

        <div class="mb-4">Table: ${order.table_number}</div>

        ${allItems.map(item => `
          <div class="flex">
            <div>${item.quantity} ${item.name}</div>
            <div>$${(item.price * item.quantity).toFixed(2)}</div>
          </div>
          ${item.note ? `<div style="font-size: 10px; color: #666;">Note: ${item.note}</div>` : ''}
        `).join('')}

        <div class="border-top">
          <div class="flex">
            <div>Subtotal:</div>
            <div>$${subtotal.toFixed(2)}</div>
          </div>
          <div class="flex">
            <div>GST (9%):</div>
            <div>$${tax.toFixed(2)}</div>
          </div>
          <div class="flex bold">
            <div>Total:</div>
            <div>$${total.toFixed(2)}</div>
          </div>
        </div>

        <div class="center" style="margin-top: 20px;">
          <div>Thank You For Dining With Us!</div>
          <div>Please Visit Again</div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

const ReceiptView = ({ order }) => {
  const allItems = [...(order.items || []), ...(order.childOrders || []).flatMap(child => child.items || [])];
  const subtotal = parseFloat(order.total_amount || 0);
  const tax = subtotal * 0.09;
  const total = subtotal + tax;
  
  return (
    <Box
      fontFamily="monospace"
      width="300px"
      margin="0 auto"
    >
      <VStack spacing={1} align="center" mb={4}>
        <Text fontWeight="bold">MITRA DA DHABA</Text>
        <Text>46 Desker Road, #01-01</Text>
        <Text>Singapore - 209577</Text>
        <Text>Tel: +65 1234 5678</Text>
      </VStack>

      <HStack justify="space-between" mb={2}>
        <Text>Order: #{order.id}</Text>
        <Text>{new Date().toLocaleString()}</Text>
      </HStack>

      <Text mb={4}>Table: {order.table_number}</Text>

      <VStack align="stretch" spacing={2} mb={4}>
        {allItems.map((item, index) => (
          <Box key={index}>
            <HStack justify="space-between">
              <Text>{item.quantity} {item.name}</Text>
              <Text>${(item.price * item.quantity).toFixed(2)}</Text>
            </HStack>
            {item.note && (
              <Text fontSize="sm" color="gray.600">Note: {item.note}</Text>
            )}
          </Box>
        ))}
      </VStack>

      <Box borderTopWidth={1} pt={2}>
        <HStack justify="space-between">
          <Text>Subtotal:</Text>
          <Text>${subtotal.toFixed(2)}</Text>
        </HStack>
        <HStack justify="space-between">
          <Text>GST (9%):</Text>
          <Text>${tax.toFixed(2)}</Text>
        </HStack>
        <HStack justify="space-between" fontWeight="bold">
          <Text>Total:</Text>
          <Text>${total.toFixed(2)}</Text>
        </HStack>
      </Box>

      <VStack spacing={1} align="center" mt={4}>
        <Text>Thank You For Dining With Us!</Text>
        <Text>Please Visit Again</Text>
      </VStack>
    </Box>
  );
};

export default function CashierDashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedParentOrder, setSelectedParentOrder] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const ws = useRef(null);

  useEffect(() => {
    fetchOrders();
    setupWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const setupWebSocket = () => {
    ws.current = new WebSocket('ws://localhost:3001');

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket Update:', data);
        if (data.type === 'newOrder' || data.type === 'orderUpdate') {
          fetchOrders();
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setTimeout(setupWebSocket, 3000);
    };
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      console.log('Fetched Orders:', data);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handlePayment = async (order) => {
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${order.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'paid',
          table_number: order.table_number
        })
      });

      if (!response.ok) throw new Error('Failed to process payment');

      printReceipt(order);
      await fetchOrders();

      toast({
        title: 'Payment Complete',
        description: 'Receipt has been printed and table is now available',
        status: 'success',
        duration: 3000,
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payment: ' + error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleOrderConfirm = async (order) => {
    try {
      if (mergeMode && selectedParentOrder) {
        const response = await fetch(
          `http://localhost:3001/api/orders/${selectedParentOrder.id}/merge/${order.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        if (!response.ok) throw new Error('Failed to merge orders');
        toast({
          title: 'Orders Merged',
          description: `Order #${order.id} merged into #${selectedParentOrder.id}`,
          status: 'success',
          duration: 3000,
        });
        setMergeMode(false);
        setSelectedParentOrder(null);
        await fetchOrders();
      } else {
        await updateOrderStatus(order.id, 'confirmed');
        await fetchOrders();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update order status');

      await fetchOrders();

      toast({
        title: 'Order Updated',
        description: `Order #${orderId} status updated to ${status}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    onOpen();
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading>Cashier Dashboard</Heading>
          {mergeMode && (
            <Button 
              colorScheme="orange" 
              onClick={() => {
                setMergeMode(false);
                setSelectedParentOrder(null);
              }}
            >
              Cancel Merge Mode
            </Button>
          )}
        </HStack>

        <Card>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Order ID</Th>
                  <Th>Table</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {orders.map((order) => (
                  <Tr 
                    key={order.id}
                    bg={
                      mergeMode && 
                      selectedParentOrder?.table_number === order.table_number && 
                      selectedParentOrder.id !== order.id
                        ? 'blue.50'
                        : undefined
                    }
                  >
                    <Td>#{order.id}</Td>
                    <Td>Table {order.table_number}</Td>
                    <Td>${(parseFloat(order.total_amount) || 0).toFixed(2)}</Td>
                    <Td>
                      <StatusBadge 
                        status={order.status || 'pending'} 
                        isMerged={order.status === 'merged'} 
                      />
                    </Td>
                    <Td>
                      <Stack direction="row" spacing={2}>
                        <Button
                          size="sm"
                          onClick={() => viewOrderDetails(order)}
                        >
                          View
                        </Button>

                        {order.status === 'confirmed' && !order.parent_order_id && (
                          <>
                            <Button
                              size="sm"
                              colorScheme={mergeMode ? 'gray' : 'blue'}
                              onClick={() => {
                                if (!mergeMode) {
                                  setMergeMode(true);
                                  setSelectedParentOrder(order);
                                }
                              }}
                              disabled={mergeMode && selectedParentOrder?.id !== order.id}
                            >
                              {mergeMode && selectedParentOrder?.id === order.id ? 'Select Order to Merge' : 'Merge Orders'}
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() => handlePayment(order)}
                            >
                              Paid
                            </Button>
                          </>
                        )}

                        {order.status === 'pending' && !order.parent_order_id && (
                          <>
                            {mergeMode ? (
                              selectedParentOrder && selectedParentOrder.table_number === order.table_number && (
                                <Button
                                  size="sm"
                                  colorScheme="green"
                                  onClick={() => handleOrderConfirm(order)}
                                >
                                  Merge into #{selectedParentOrder.id}
                                </Button>
                              )
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  colorScheme="green"
                                  onClick={() => handleOrderConfirm(order)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  colorScheme="red"
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </Stack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Order Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedOrder && <ReceiptView order={selectedOrder} />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}