'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  useToast,
  Switch,
  Textarea,
  VStack,
  HStack,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';

const AdminDashboard = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const fileInputRef = useRef();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_spicy: false,
    is_recommended: false,
    is_available: true,
    image: null,
    image_preview: null
  });

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      toast({
        title: 'Error fetching categories',
        description: 'Please refresh the page or try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchMenuItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/menu/all');
      const data = await res.json();
      setMenuItems(data);
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

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
        image_preview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'image' && formData[key]) {
        formDataToSend.append('image', formData[key]);
      } else if (key !== 'image_preview' && formData[key] !== null) {
        formDataToSend.append(key, String(formData[key]));
      }
    });

    try {
      const url = selectedItem
        ? `http://localhost:3001/api/menu/${selectedItem.id}`
        : 'http://localhost:3001/api/menu';
      
      const method = selectedItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to save menu item');
      }

      toast({
        title: `Menu item ${selectedItem ? 'updated' : 'created'} successfully`,
        status: 'success',
        duration: 3000,
      });
      
      fetchMenuItems();
      handleClose();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: 'Error saving menu item',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      is_spicy: item.is_spicy,
      is_recommended: item.is_recommended,
      is_available: item.is_available,
      image: null,
      image_preview: item.image_url
    });
    onOpen();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`http://localhost:3001/api/menu/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast({
            title: 'Menu item deleted successfully',
            status: 'success',
            duration: 3000,
          });
          fetchMenuItems();
        }
      } catch (error) {
        toast({
          title: 'Error deleting menu item',
          description: error.message,
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  const handleClose = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      is_spicy: false,
      is_recommended: false,
      is_available: true,
      image: null,
      image_preview: null
    });
    onClose();
  };

  return (
    <Container maxW="container.xl" py={8}>
      <HStack justify="space-between" mb={6}>
        <Heading>Menu Management</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="green" onClick={onOpen}>
          Add New Item
        </Button>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Image</Th>
            <Th>Name</Th>
            <Th>Category</Th>
            <Th>Price</Th>
            <Th>Available</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {Array.isArray(menuItems) && menuItems.map((item) => (
            <Tr key={item.id}>
              <Td>
                <Image
                  src={item.image_url || '/placeholder-food.jpg'}
                  alt={item.name}
                  boxSize="50px"
                  objectFit="cover"
                  borderRadius="md"
                />
              </Td>
              <Td>{item.name}</Td>
              <Td>
                {categories.find(cat => cat.id === item.category_id)?.name}
              </Td>
              <Td>${parseFloat(item.price).toFixed(2)}</Td>
              <Td>
                <Switch
                  isChecked={item.is_available}
                  onChange={async () => {
                    try {
                      const response = await fetch(
                        `http://localhost:3001/api/menu/${item.id}/availability`,
                        {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            is_available: !item.is_available
                          }),
                        }
                      );

                      if (!response.ok) {
                        throw new Error('Failed to update availability');
                      }

                      await fetchMenuItems();

                      toast({
                        title: `${item.name} is now ${!item.is_available ? 'available' : 'unavailable'}`,
                        status: 'success',
                        duration: 2000,
                      });
                    } catch (error) {
                      console.error('Toggle error:', error);
                      toast({
                        title: 'Error updating availability',
                        description: error.message,
                        status: 'error',
                        duration: 3000,
                      });
                    }
                  }}
                  colorScheme="green"
                />
              </Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton
                    icon={<EditIcon />}
                    onClick={() => handleEdit(item)}
                    colorScheme="blue"
                    size="sm"
                  />
                  <IconButton
                    icon={<DeleteIcon />}
                    onClick={() => handleDelete(item.id)}
                    colorScheme="red"
                    size="sm"
                  />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={handleClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Price</FormLabel>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                />
              </FormControl>

              <HStack width="100%" spacing={8}>
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Spicy</FormLabel>
                  <Switch
                    name="is_spicy"
                    isChecked={formData.is_spicy}
                    onChange={handleInputChange}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Recommended</FormLabel>
                  <Switch
                    name="is_recommended"
                    isChecked={formData.is_recommended}
                    onChange={handleInputChange}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Available</FormLabel>
                  <Switch
                    name="is_available"
                    isChecked={formData.is_available}
                    onChange={handleInputChange}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Image</FormLabel>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
                <Button onClick={() => fileInputRef.current.click()}>
                  Choose Image
                </Button>
                {formData.image_preview && (
                  <Box mt={2}>
                    <Image
                      src={formData.image_preview}
                      alt="Preview"
                      maxH="200px"
                      objectFit="cover"
                    />
                  </Box>
                )}
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {selectedItem ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default AdminDashboard;