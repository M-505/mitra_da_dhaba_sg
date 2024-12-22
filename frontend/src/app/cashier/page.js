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
  }[status];

  return (
    <Badge colorScheme={colorScheme}>
      {isMerged ? 'MERGED' : status.toUpperCase()}
    </Badge>
  );
};

const ReceiptView = ({ order }) => {
  const allItems = [...(order.items || []), ...(order.childOrders || []).flatMap(child => child.items || [])];
  
  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <Text fontWeight="bold">Order #{order.id}</Text>
        <Text>Table: {order.table_number}</Text>
        <Text>Status: <StatusBadge status={order.status || 'pending'} /></Text>
      </Box>

      <Box>
        <Text fontWeight="bold" mb={2}>Items:</Text>
        {allItems.map((item, index) => (
          <HStack key={index} justify="space-between" mb={2}>
            <VStack align="start" spacing={0}>
              <Text>{item.quantity}x {item.name}</Text>
              {item.note && (
                <Text fontSize="sm" color="gray.600">Note: {item.note}</Text>
              )}
            </VStack>
            <Text>${(item.price * item.quantity).toFixed(2)}</Text>
          </HStack>
        ))}
      </Box>

      <Box borderTopWidth={1} pt={4}>
        <HStack justify="space-between">
          <Text>Subtotal:</Text>
          <Text>${parseFloat(order.total_amount || 0).toFixed(2)}</Text>
        </HStack>
        <HStack justify="space-between">
          <Text>GST (8%):</Text>
          <Text>${((order.total_amount || 0) * 0.08).toFixed(2)}</Text>
        </HStack>
        <HStack justify="space-between" fontWeight="bold">
          <Text>Total:</Text>
          <Text>${((order.total_amount || 0) * 1.08).toFixed(2)}</Text>
        </HStack>
      </Box>
    </VStack>
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
        console.log('WebSocket Update:', data); // Debugging WebSocket updates
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
      console.log('Fetched Orders:', data); // Debugging fetched orders
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

                        {order.status === 'confirmed' && (
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
                        )}

                        {order.status === 'pending' && (
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
