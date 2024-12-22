'use client'

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  Tab,
  SimpleGrid,
  Card,
  CardBody,
  Stack,
  Button,
  Image,
  VStack,
  Center,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  useToast,
  IconButton,
  HStack,
  Badge,
  Textarea,
  Tooltip,
  Tag,
  TagLeftIcon,
  TagLabel,
} from '@chakra-ui/react';
import {
  SearchIcon,
  DeleteIcon,
  InfoIcon,
  StarIcon,
  WarningIcon
} from '@chakra-ui/icons';
import { motion, AnimatePresence } from 'framer-motion';

const MotionCard = motion(Card);
const MotionSimpleGrid = motion(SimpleGrid);

// Food Indicator Component
const FoodIndicator = ({ isSpicy, isVeg, isRecommended }) => {
  return (
    <HStack spacing={2}>
      {isSpicy && (
        <Tooltip label="Spicy">
          <Tag size="sm" colorScheme="red">
            <TagLeftIcon as={WarningIcon} />
            <TagLabel>Spicy</TagLabel>
          </Tag>
        </Tooltip>
      )}
      {isVeg && (
        <Tooltip label="Vegetarian">
          <Tag size="sm" colorScheme="green">
            <TagLeftIcon boxSize="12px" as={() => (
              <span style={{ fontSize: '16px' }}>🥬</span>
            )} />
            <TagLabel>Veg</TagLabel>
          </Tag>
        </Tooltip>
      )}
      {isRecommended && (
        <Tooltip label="Chef's Recommendation">
          <Tag size="sm" colorScheme="purple">
            <TagLeftIcon as={StarIcon} />
            <TagLabel>Chef's Special</TagLabel>
          </Tag>
        </Tooltip>
      )}
    </HStack>
  );
};

// Cart Item Component
const CartItem = ({ item, updateQuantity, removeFromCart, updateNote }) => {
  return (
    <Card variant="outline">
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box flex="1">
              <Heading size="sm">{item.name}</Heading>
              <Text color="blue.600">
                ${parseFloat(item.price * item.quantity).toFixed(2)}
              </Text>
              <FoodIndicator
                isSpicy={item.isSpicy}
                isVeg={item.isVeg}
                isRecommended={item.isRecommended}
              />
            </Box>
            <HStack>
              <Button
                size="sm"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
              >
                -
              </Button>
              <Text>{item.quantity}</Text>
              <Button
                size="sm"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
              >
                +
              </Button>
              <IconButton
                icon={<DeleteIcon />}
                onClick={() => removeFromCart(item.id)}
                colorScheme="red"
                variant="ghost"
                size="sm"
              />
            </HStack>
          </Stack>
          <Textarea
            placeholder="Special instructions (allergies, spice level, etc.)"
            size="sm"
            value={item.note || ''}
            onChange={(e) => updateNote(item.id, e.target.value)}
            resize="none"
          />
        </VStack>
      </CardBody>
    </Card>
  );
};

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [menuItems, setMenuItems] = useState({});
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableNumber, setTableNumber] = useState(1);
  const toast = useToast();

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/menu');
      const data = await res.json();
      const categoryMap = {};
      data.forEach((item) => {
        if (item.is_available) {
          if (!categoryMap[item.category_id]) {
            categoryMap[item.category_id] = [];
          }
          categoryMap[item.category_id].push(item);
        }
      });
      setCategories(Object.keys(categoryMap));
      setMenuItems(categoryMap);
      setActiveCategory(Object.keys(categoryMap)[0]);
    } catch (err) {
      toast({
        title: 'Error fetching menu',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i.id === item.id);
      if (existingItem) {
        return prevCart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    toast({
      title: 'Added to cart',
      description: `${item.name} added to cart`,
      status: 'success',
      duration: 1000,
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateNote = (itemId, note) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, note } : item
      )
    );
  };

  const filteredMenuItems = searchTerm
    ? Object.values(menuItems).flat().filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : menuItems[activeCategory] || [];

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const placeOrder = async () => {
    try {
      const orderData = {
        tableNumber,
        items: cart,
        total: cartTotal,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error('Failed to place order');

      toast({
        title: 'Order Placed Successfully',
        description: 'Your order has been sent to the cashier',
        status: 'success',
        duration: 3000,
      });
      onClose();
      setCart([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading Menu...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Center flexDirection="column">
          <Image
            src="/logo.png"
            alt="Mitra Da Dhaba"
            borderRadius="full"
            boxSize="100px"
            fallbackSrc="https://via.placeholder.com/100"
          />
          <Heading mt={4}>Mitra Da Dhaba</Heading>
          <Text color="gray.600">46 Desker Road, #01-01, Singapore - 209577</Text>
          <Heading size="lg" mt={6}>Table {tableNumber} - Menu</Heading>
        </Center>

        <HStack spacing={4}>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Button
            colorScheme="blue"
            onClick={onOpen}
            position="relative"
          >
            Cart
            {cart.length > 0 && (
              <Badge
                colorScheme="red"
                position="absolute"
                top="-2"
                right="-2"
                borderRadius="full"
              >
                {cart.length}
              </Badge>
            )}
          </Button>
        </HStack>

        {!searchTerm && (
          <Tabs onChange={(index) => setActiveCategory(categories[index])} isFitted variant="enclosed">
            <TabList overflowX="auto" whiteSpace="nowrap">
              {categories.map((category) => (
                <Tab key={category}>{category.replace('_', ' ').toUpperCase()}</Tab>
              ))}
            </TabList>
          </Tabs>
        )}

        <MotionSimpleGrid
          columns={{ base: 1, md: 2 }}
          spacing={4}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence>
            {filteredMenuItems.map((item) => (
              <MotionCard
                key={item.id}
                variant="outline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Box flex="1">
                        <Heading size="md">{item.name}</Heading>
                        <FoodIndicator
                          isSpicy={item.isSpicy}
                          isVeg={item.isVeg}
                          isRecommended={item.isRecommended}
                        />
                        <Text py={2}>{item.description}</Text>
                        <Text color="blue.600" fontSize="xl">
                          ${parseFloat(item.price).toFixed(2)}
                        </Text>
                      </Box>
                      <Button
                        colorScheme="blue"
                        onClick={() => addToCart(item)}
                      >
                        Add +
                      </Button>
                    </Stack>
                  </VStack>
                </CardBody>
              </MotionCard>
            ))}
          </AnimatePresence>
        </MotionSimpleGrid>
      </VStack>

      {/* Cart Drawer */}
      <Drawer isOpen={isOpen} onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Your Cart - Table {tableNumber}</DrawerHeader>

          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {cart.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  updateQuantity={updateQuantity}
                  removeFromCart={removeFromCart}
                  updateNote={updateNote}
                />
              ))}
              {cart.length === 0 && (
                <Text textAlign="center" color="gray.500">
                  Your cart is empty
                </Text>
              )}
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px">
            <VStack width="100%" spacing={4}>
              <Text width="100%" fontSize="xl" fontWeight="bold">
                Total: ${cartTotal.toFixed(2)}
              </Text>
              <Button
                colorScheme="blue"
                width="100%"
                onClick={placeOrder}
                isDisabled={cart.length === 0}
              >
                Place Order
              </Button>
            </VStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Container>
  );
}