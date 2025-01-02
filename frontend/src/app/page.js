'use client';

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
import { SearchIcon, DeleteIcon, StarIcon } from '@chakra-ui/icons';
import { MdWhatshot } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

const MotionCard = motion(Card);
const MotionSimpleGrid = motion(SimpleGrid);

const customHeading = {
  fontFamily: `'Mukta', sans-serif`,
  textShadow: '2px 2px 6px rgba(0, 0, 0, 0.8)',
};

const FoodIndicator = ({ isSpicy, isVeg, isRecommended }) => (
  <HStack spacing={2}>
    {isSpicy && (
      <Tooltip label="Spicy">
        <Tag size="sm" colorScheme="red">
          <TagLeftIcon as={MdWhatshot} />
          <TagLabel>Spicy</TagLabel>
        </Tag>
      </Tooltip>
    )}
    {isVeg && (
      <Tooltip label="Vegetarian">
        <Tag size="sm" colorScheme="green">
          <TagLeftIcon as={() => <span>🥬</span>} />
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

const CartItem = ({ item, updateQuantity, removeFromCart, updateNote }) => (
  <Card variant="outline" bg="rgba(0, 0, 0, 0.7)" color="white">
    <CardBody>
      <VStack align="stretch" spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box flex="1">
            <Heading size="sm">{item.name}</Heading>
            <Text>${parseFloat(item.price * item.quantity || 0).toFixed(2)}</Text>
            <FoodIndicator
              isSpicy={item.is_spicy}
              isVeg={item.is_veg}
              isRecommended={item.is_recommended}
            />
          </Box>
          <HStack>
            <Button size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
              -
            </Button>
            <Text>{item.quantity}</Text>
            <Button size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
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
          placeholder="Special instructions (e.g., allergies, spice level)"
          size="sm"
          value={item.note || ''}
          onChange={(e) => updateNote(item.id, e.target.value)}
          resize="none"
        />
      </VStack>
    </CardBody>
  </Card>
);

export default function Home() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [menuItems, setMenuItems] = useState({});
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableNumber, setTableNumber] = useState(1);
  const [socket, setSocket] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchMenuItems();

    // Setup WebSocket connection
    const ws = new WebSocket('ws://localhost:3001');
    setSocket(ws);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'MENU_UPDATE') {
        fetchMenuItems(); // Refetch menu items when update received
      }
    };

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const fetchMenuItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/menu');
      const data = await res.json();
      const categoryMap = {};
      data.forEach((item) => {
        item.price = parseFloat(item.price || 0);
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
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateNote = (itemId, note) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === itemId ? { ...item, note } : item
      )
    );
  };

  const placeOrder = async () => {
    try {
      const orderData = {
        tableNumber: tableNumber,
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          note: item.note || null
        }))
      };

      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to place order');
      }

      toast({
        title: 'Order placed!',
        description: `Your order has been sent to the cashier.`,
        status: 'success',
        duration: 3000,
      });

      setCart([]);
      onClose();

    } catch (err) {
      console.error('Order error:', err);
      toast({
        title: 'Order failed',
        description: 'Failed to place order. Please try again.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const filteredMenuItems = searchTerm
    ? Object.values(menuItems)
        .flat()
        .filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
    : menuItems[activeCategory] || [];

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

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
    <Box
      bgImage="url('/assets/background.png')"
      bgSize="cover"
      bgPos="center"
      bgAttachment="fixed"
      minH="100vh"
      color="white"
      position="relative"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        w="100%"
        h="100%"
        bg="rgba(0, 0, 0, 0.4)"
        zIndex={0}
      />
      <Container maxW="container.xl" py={8} zIndex={1} position="relative">
        <VStack spacing={6} align="stretch">
          <Center flexDirection="column">
            <Image
              src="/assets/logo.png"
              alt="Mitra Da Dhaba"
              borderRadius="full"
              boxSize={{ base: '80px', md: '100px' }}
              fallbackSrc="https://via.placeholder.com/100"
            />
            <Heading mt={4} {...customHeading}>
              Mitra Da Dhaba
            </Heading>
            <Text {...customHeading} color="gray.50">
              46 Desker Road, #01-01, Singapore - 209577
            </Text>
            <Heading size="lg" mt={6} {...customHeading}>
              Table {tableNumber} - Menu
            </Heading>
          </Center>

          <HStack spacing={4}>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.50" />
              </InputLeftElement>
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            <Button colorScheme="orange" onClick={onOpen}>
              Cart
              {cart.length > 0 && (
                <Badge colorScheme="red" ml={2}>
                  {cart.length}
                </Badge>
              )}
            </Button>
          </HStack>

          <Tabs onChange={(index) => setActiveCategory(categories[index])} isFitted variant="enclosed">
            <TabList overflowX="auto" whiteSpace="nowrap">
              {categories.map((category) => (
                <Tab key={category}>{category.replace('_', ' ').toUpperCase()}</Tab>
              ))}
            </TabList>
          </Tabs>

          <MotionSimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <AnimatePresence>
              {filteredMenuItems.map((item) => (
                <MotionCard
                  key={item.id}
                  bg="rgba(255, 255, 255, 0.8)"
                  borderRadius="lg"
                  boxShadow="0px 4px 10px rgba(0, 0, 0, 0.5)"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      {item.image_url && (
                        <Box
                          position="relative"
                          width="100%"
                          height="200px"
                          overflow="hidden"
                          borderRadius="md"
                        >
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            objectFit="cover"
                            width="100%"
                            height="100%"
                            fallbackSrc="https://via.placeholder.com/400x200?text=No+Image"
                          />
                        </Box>
                      )}
                      <HStack justify="space-between" align="start">
                        <Heading size="md" color="black" fontFamily="'Mukta', sans-serif">
                          {item.name}
                        </Heading>
                        <HStack spacing={2}>
                          {item.is_spicy && (
                            <Tooltip label="Spicy">
                              <Box color="red.500">
                                <MdWhatshot size={24} />
                              </Box>
                            </Tooltip>
                          )}
                          {item.is_recommended && (
                            <Tooltip label="Chef's Recommendation">
                              <Box color="green.500">
                                <StarIcon boxSize={5} />
                              </Box>
                            </Tooltip>
                          )}
                        </HStack>
                      </HStack>
                      <Text color="black" fontFamily="'Baloo Bhaina 2', cursive">
                        {item.description}
                      </Text>
                      <Text color="blue.600" fontSize="xl">
                        ${item.price.toFixed(2)}
                      </Text>
                      <Button colorScheme="orange" onClick={() => addToCart(item)}>
                        Add +
                      </Button>
                    </VStack>
                  </CardBody>
                </MotionCard>
              ))}
            </AnimatePresence>
          </MotionSimpleGrid>
        </VStack>
      </Container>

      <Drawer isOpen={isOpen} onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent bg="rgba(0, 0, 0, 0.7)" color="white">
          <DrawerCloseButton />
          <DrawerHeader>Your Cart</DrawerHeader>

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
                <Text textAlign="center" color="gray.300">
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
                colorScheme="orange"
                width="100%"
                onClick={placeOrder}
                isDisabled={cart.length === 0}
              >Place Order
              </Button>
            </VStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}