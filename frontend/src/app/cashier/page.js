'use client'

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
  Badge,
  useToast,
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
  Divider,
  IconButton,
} from '@chakra-ui/react';
import { DeleteIcon, MinusIcon, AddIcon } from '@chakra-ui/icons';

const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const StatusBadge = ({ status }) => {
  const colorScheme = {
    [OrderStatus.PENDING]: 'yellow',
    [OrderStatus.CONFIRMED]: 'blue',
    [OrderStatus.PREPARING]: 'purple',
    [OrderStatus.COMPLETED]: 'green',
    [OrderStatus.CANCELLED]: 'red',
  }[status];

  return (
    <Badge colorScheme={colorScheme}>
      {status.toUpperCase()}
    </Badge>
  );
};

const ReceiptView = ({ order, onUpdateOrder }) => {
  // DO NOT group or sum quantities - display exactly as received from database
  const orderItems = order.items.map(item => ({
    ...item,
    id: item.id,            // from order_items.id
    menu_item_id: item.menu_item_id,
    name: item.name,
    quantity: item.quantity // use exact quantity from database
  }));

  // Sort items by menu_item_id for consistent display
  const sortedItems = orderItems.sort((a, b) => 
    String(a.menu_item_id).localeCompare(String(b.menu_item_id))
  );

  const removeItem = (orderItemId) => {
    const updatedItems = order.items.filter(item => item.id !== orderItemId);
    if (updatedItems.length === 0) {
      onUpdateOrder({
        ...order,
        items: [],
        status: OrderStatus.CANCELLED,
        total: 0
      });
    } else {
      onUpdateOrder({
        ...order,
        items: updatedItems,
        total: calculateOrderTotal(updatedItems)
      });
    }
  };

  const updateItemQuantity = (orderItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(orderItemId);
      return;
    }

    const updatedItems = order.items.map(item => {
      if (item.id === orderItemId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    onUpdateOrder({
      ...order,
      items: updatedItems,
      total: calculateOrderTotal(updatedItems)
    });
  };

  return (
    <Box bg="white" p={6} fontFamily="monospace" width="350px" mx="auto">
      {/* Receipt Header */}
      <VStack spacing={1} align="center" mb={4}>
        <Text fontWeight="bold">MITRA DA DHABA</Text>
        <Text>46 Desker Road, #01-01</Text>
        <Text>Singapore - 209577</Text>
        <Text>Tel: +65 1234 5678</Text>
      </VStack>

      <Divider my={2} />

      {/* Order Info */}
      <HStack justify="space-between" mb={2}>
        <Text>Order: #{order.id}</Text>
        <Text>{new Date(order.timestamp || Date.now()).toLocaleString()}</Text>
      </HStack>
      <Text mb={2}>Table: {order.tableNumber}</Text>
      <Text mb={2}>Status: <StatusBadge status={order.status || 'pending'} /></Text>

      <Divider my={2} />

      {/* Order Items */}
      <VStack align="stretch" spacing={2} mb={4}>
        {orderItems.map((item) => (
          <Box key={item.id} p={2} borderWidth="1px" borderRadius="md">
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={0} flex={1}>
                <HStack justify="space-between" width="100%">
                  <Text fontWeight="bold">{`${item.quantity} x ${item.name}`}</Text>
                  <Text>${(item.price * item.quantity).toFixed(2)}</Text>
                </HStack>
                {item.note && (
                  <Text fontSize="sm" color="gray.600">
                    Note: {item.note}
                  </Text>
                )}
                <HStack mt={2}>
                  <IconButton
                    size="xs"
                    icon={<MinusIcon />}
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  />
                  <Text>{item.quantity}</Text>
                  <IconButton
                    size="xs"
                    icon={<AddIcon />}
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    aria-label="Increase quantity"
                  />
                  <IconButton
                    size="xs"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove item"
                  />
                </HStack>
              </VStack>
            </HStack>
          </Box>
        ))}
      </VStack>

      {/* Totals */}
      <VStack align="stretch" spacing={1}>
        <HStack justify="space-between">
          <Text>Subtotal:</Text>
          <Text>${order.total?.toFixed(2)}</Text>
        </HStack>
        <HStack justify="space-between">
          <Text>GST (8%):</Text>
          <Text>${(order.total * 0.08).toFixed(2)}</Text>
        </HStack>
        <HStack justify="space-between" fontWeight="bold">
          <Text>Total:</Text>
          <Text>${(order.total * 1.08).toFixed(2)}</Text>
        </HStack>
      </VStack>

      <Divider my={4} />

      {/* Footer */}
      <VStack spacing={1} align="center">
        <Text>Thank You For Dining With Us!</Text>
        <Text>Please Visit Again</Text>
      </VStack>
    </Box>
  );
};

export default function CashierDashboard() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const ws = useRef(null);

  const calculateOrderTotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/orders');
      const data = await response.json();
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    onOpen();
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading>Cashier Dashboard</Heading>

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
                  <Tr key={order.id}>
                    <Td>#{order.id}</Td>
                    <Td>Table {order.table_number}</Td>
                    <Td>${order.total_amount?.toFixed(2) || '0.00'}</Td>
                    <Td><StatusBadge status={order.status || 'pending'} /></Td>
                    <Td>
                      <Stack direction="row" spacing={2}>
                        <Button
                          size="sm"
                          onClick={() => viewOrderDetails(order)}
                        >
                          View
                        </Button>
                        {(!order.status || order.status === 'pending') && (
                          <>
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
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
                      </Stack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>

      {/* Receipt Modal */}
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