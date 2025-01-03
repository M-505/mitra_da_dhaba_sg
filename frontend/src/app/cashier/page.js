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
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Badge,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  IconButton,
} from '@chakra-ui/react';
import { InfoIcon, DeleteIcon } from '@chakra-ui/icons';

const StatusBadge = ({ status, isMerged }) => {
  const colorScheme = {
    pending: 'yellow',
    accepted: 'blue',
    preparing: 'purple',
    completed: 'green',
    cancelled: 'red',
    merged: 'gray',
    paid: 'teal',
  }[status];

  return (
    <Badge colorScheme={colorScheme}>
      {isMerged ? 'MERGED' : status.toUpperCase()}
    </Badge>
  );
};

const EditOrderModal = ({ isOpen, onClose, order, onSave }) => {
  const [items, setItems] = useState(order?.items || []);
  const toast = useToast();

  useEffect(() => {
    setItems(order?.items || []);
  }, [order]);

  const handleQuantityChange = (index, newQuantity) => {
    const updatedItems = [...items];
    updatedItems[index].quantity = Math.max(1, parseInt(newQuantity) || 1);
    setItems(updatedItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleNoteChange = (index, note) => {
    const updatedItems = [...items];
    updatedItems[index].note = note;
    setItems(updatedItems);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            menu_item_id: item.menu_item_id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            note: item.note || null
          })),
          total_amount: items.reduce((sum, item) => 
            sum + (parseFloat(item.price) * parseInt(item.quantity)), 0
          )
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }

      const updatedOrder = await response.json();

      // If updatedOrder is null => the order was deleted (no items)
      toast({
        title: updatedOrder ? 'Order Updated' : 'Order Removed',
        status: 'success',
        duration: 3000,
      });

      onSave(updatedOrder); // pass updated (or null) back to the parent
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Order #{order?.id}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <Table>
              <Thead>
                <Tr>
                  <Th>Item</Th>
                  <Th>Price</Th>
                  <Th>Quantity</Th>
                  <Th>Notes</Th>
                  <Th>Total</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((item, index) => (
                  <Tr key={index}>
                    <Td>{item.name}</Td>
                    <Td>${parseFloat(item.price).toFixed(2)}</Td>
                    <Td>
                      <NumberInput
                        value={item.quantity}
                        min={1}
                        size="sm"
                        maxW={20}
                        onChange={(value) => handleQuantityChange(index, value)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Td>
                    <Td>
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => handleNoteChange(index, e.target.value)}
                        placeholder="Add note"
                        style={{ width: '100%', padding: '4px' }}
                      />
                    </Td>
                    <Td>${(item.price * item.quantity).toFixed(2)}</Td>
                    <Td>
                      <IconButton
                        icon={<DeleteIcon />}
                        onClick={() => handleRemoveItem(index)}
                        colorScheme="red"
                        size="sm"
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <Text fontWeight="bold">
              Total: ${items.reduce((sum, item) =>
                sum + (parseFloat(item.price) * parseInt(item.quantity)), 0
              ).toFixed(2)}
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    return '';
  }
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
  // States
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedParentOrder, setSelectedParentOrder] = useState(null);
  const [orderToMerge, setOrderToMerge] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chakra UI hooks
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose
  } = useDisclosure();
  const {
    isOpen: isMergeAlertOpen,
    onOpen: onMergeAlertOpen,
    onClose: onMergeAlertClose
  } = useDisclosure();

  const cancelRef = useRef();
  const toast = useToast();
  const ws = useRef(null);

  // Helper Functions
  const isInitialOrder = (order, allOrders) => {
    const tableOrders = allOrders
      .filter(o =>
        o.table_number === order.table_number &&
        o.status !== 'merged' &&
        o.status !== 'cancelled'
      )
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));
    
    return tableOrders[0]?.id === order.id;
  };

  const canBeMerged = (parentOrder, childOrder, allOrders) => {
    const result = (
      parentOrder.status === 'accepted' &&
      childOrder.status === 'accepted' &&
      parentOrder.table_number === childOrder.table_number &&
      isInitialOrder(parentOrder, allOrders) &&
      !isInitialOrder(childOrder, allOrders) &&
      parentOrder.id !== childOrder.id
    );
    return result;
  };

  // WebSocket Setup
  useEffect(() => {
    fetchOrders();

    const setupWS = () => {
      const wsClient = new WebSocket('ws://localhost:3001');

      wsClient.onopen = () => {
        console.log('WebSocket Connected');
      };

      wsClient.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_ORDER' ||
              data.type === 'ORDER_STATUS_UPDATED' ||
              data.type === 'ORDERS_MERGED') {
            fetchOrders();
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      wsClient.onclose = () => {
        console.log('WebSocket Disconnected, attempting to reconnect...');
        setTimeout(setupWS, 3000);
      };

      wsClient.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return wsClient;
    };

    const wsInstance = setupWS();
    return () => {
      if (wsInstance) wsInstance.close();
    };
  }, []);

  // Order Management Functions
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();

      // Show only top-level orders (no parent_order_id)
      const sortedOrders = data
        .filter(order => !order.parent_order_id)
        .sort((a, b) => parseInt(b.id) - parseInt(a.id));
      
      setOrders(sortedOrders);
    } catch (error) {
      toast({
        title: 'Error fetching orders',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeClick = (order) => {
    setSelectedParentOrder(order);
    setMergeMode(true);
    toast({
      title: 'Merge Mode Activated',
      description: `Select orders from Table ${order.table_number} to merge into Order #${order.id}`,
      status: 'info',
      duration: 5000,
    });
  };

  const handleMergeSelect = (orderToMerge) => {
    setOrderToMerge(orderToMerge);
    onMergeAlertOpen();
  };

  const handleMergeConfirm = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/orders/${selectedParentOrder.id}/merge/${orderToMerge.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to merge orders');
      }

      toast({
        title: 'Orders Merged Successfully',
        description: `Order #${orderToMerge.id} has been merged into Order #${selectedParentOrder.id}`,
        status: 'success',
        duration: 3000,
      });

      setMergeMode(false);
      setSelectedParentOrder(null);
      setOrderToMerge(null);
      onMergeAlertClose();
      await fetchOrders();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
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
        }
      });

      if (!response.ok) throw new Error('Failed to process payment');

      printReceipt(order);
      await fetchOrders();

      toast({
        title: 'Payment Complete',
        description: 'Receipt has been printed',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleOrderAccept = async (order) => {
    try {
      await updateOrderStatus(order.id, 'accepted');
      toast({
        title: 'Order Accepted',
        description: `Order #${order.id} has been accepted`,
        status: 'success',
        duration: 3000,
      });
      await fetchOrders();
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
    } catch (error) {
      throw error;
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    onOpen();
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    onEditOpen();
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Heading>Cashier Dashboard</Heading>
          {mergeMode && (
            <HStack>
              <Tooltip label="In merge mode, you can only merge subsequent orders into the initial order from the same table">
                <InfoIcon color="blue.500" />
              </Tooltip>
              <Button
                colorScheme="orange"
                onClick={() => {
                  setMergeMode(false);
                  setSelectedParentOrder(null);
                }}
              >
                Cancel Merge Mode
              </Button>
            </HStack>
          )}
        </HStack>

        {/* Orders Table */}
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
                {orders.map((order) => {
                  const isInitial = isInitialOrder(order, orders);
                  const isMergeable = mergeMode &&
                    selectedParentOrder &&
                    canBeMerged(selectedParentOrder, order, orders);

                  return (
                    <Tr
                      key={order.id}
                      bg={
                        isMergeable
                          ? 'green.50'
                          : isInitial
                          ? 'blue.50'
                          : undefined
                      }
                      _hover={isMergeable ? { bg: 'green.100' } : undefined}
                    >
                      <Td>
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text>#{order.id}</Text>
                            {isInitial && (
                              <Tooltip label="Initial order for this table">
                                <Badge colorScheme="blue">Initial</Badge>
                              </Tooltip>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {formatDate(order.created_at) || 'No date available'}
                          </Text>
                        </VStack>
                      </Td>
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
                          {/* View Details */}
                          <Tooltip label="View order details">
                            <Button
                              size="sm"
                              onClick={() => viewOrderDetails(order)}
                            >
                              View
                            </Button>
                          </Tooltip>

                          {/* If order is pending and not merged, let user Accept/Cancel */}
                          {order.status === 'pending' && !order.parent_order_id && !mergeMode && (
                            <>
                              <Tooltip label="Accept the order">
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  onClick={() => handleOrderAccept(order)}
                                >
                                  Accept
                                </Button>
                              </Tooltip>
                              <Tooltip label="Cancel the order">
                                <Button
                                  size="sm"
                                  colorScheme="red"
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                >
                                  Cancel
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {/* If order is accepted (and not merged), show relevant actions */}
                          {order.status === 'accepted' && !order.parent_order_id && (
                            <>
                              <Tooltip label="Edit order items">
                                <Button
                                  size="sm"
                                  colorScheme="teal"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  Edit
                                </Button>
                              </Tooltip>

                              {/* If this is the initial order, allow enabling Merge Mode */}
                              {isInitial && (
                                <Tooltip label="Merge additional orders from this table">
                                  <Button
                                    size="sm"
                                    colorScheme={mergeMode ? 'gray' : 'blue'}
                                    onClick={() => handleMergeClick(order)}
                                    isDisabled={mergeMode && selectedParentOrder?.id !== order.id}
                                  >
                                    {mergeMode && selectedParentOrder?.id === order.id
                                      ? 'Select Order to Merge'
                                      : 'Merge Orders'}
                                  </Button>
                                </Tooltip>
                              )}

                              <Tooltip label="Mark as paid and print receipt">
                                <Button
                                  size="sm"
                                  colorScheme="green"
                                  onClick={() => handlePayment(order)}
                                >
                                  Paid
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {/* If we're in merge mode and this order can be merged, show "Select to Merge" */}
                          {mergeMode && isMergeable && (
                            <Tooltip label={`Merge into Order #${selectedParentOrder?.id}`}>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={() => handleMergeSelect(order)}
                              >
                                Select to Merge
                              </Button>
                            </Tooltip>
                          )}
                        </Stack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>

      {/* View Receipt Modal */}
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

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={isEditOpen}
        onClose={onEditClose}
        order={editingOrder}
        onSave={(updatedOrder) => {
          // If updatedOrder is null => the order was fully removed
          if (!updatedOrder) {
            // Remove from the local `orders` state
            setOrders((prev) => prev.filter((o) => o.id !== editingOrder.id));

            // If we were viewing the same order, clear it
            if (selectedOrder && selectedOrder.id === editingOrder.id) {
              setSelectedOrder(null);
            }
            return;
          }

          // If we got an actual updated order, replace it in state
          setOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          );

          // If user was viewing the same order, update it
          if (selectedOrder && selectedOrder.id === updatedOrder.id) {
            setSelectedOrder(updatedOrder);
          }
        }}
      />

      {/* Merge Alert */}
      <AlertDialog
        isOpen={isMergeAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onMergeAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Order Merge
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to merge Order #{orderToMerge?.id} into Order #{selectedParentOrder?.id}?
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onMergeAlertClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleMergeConfirm} ml={3}>
                Confirm Merge
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
}
