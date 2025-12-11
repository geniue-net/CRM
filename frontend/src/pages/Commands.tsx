import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import { Add, PlayArrow, Pause, Stop } from '@mui/icons-material';
import { Command } from '../types';
import { apiService } from '../services/api';

const Commands: React.FC = () => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    ad_account_id: '',
    target_type: 'AD',
    target_id: '',
    action: 'PAUSE',
    payload: {},
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const commandsRes = await apiService.getCommands();
      setCommands(Array.isArray(commandsRes.data) ? commandsRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setFormData({
      ad_account_id: '',
      target_type: 'AD',
      target_id: '',
      action: 'PAUSE',
      payload: {},
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    try {
      const commandData = {
        ...formData,
        idempotency_key: `${formData.action}_${formData.target_id}_${Date.now()}`,
        created_by: 'current-user',
      };
      await apiService.createCommand(commandData);
      fetchData();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create command');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'RUNNING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PAUSE':
        return <Pause />;
      case 'RESUME':
        return <PlayArrow />;
      case 'STOP':
        return <Stop />;
      default:
        return <PlayArrow />;
    }
  };

  const filteredCommands = commands.filter(cmd => {
    switch (tabValue) {
      case 0:
        return true; // All
      case 1:
        return cmd.status === 'QUEUED';
      case 2:
        return cmd.status === 'RUNNING';
      case 3:
        return cmd.status === 'SUCCEEDED';
      case 4:
        return cmd.status === 'FAILED';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Commands</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpen}
        >
          New Command
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label={`All (${commands.length})`} />
            <Tab label={`Queued (${commands.filter(c => c.status === 'QUEUED').length})`} />
            <Tab label={`Running (${commands.filter(c => c.status === 'RUNNING').length})`} />
            <Tab label={`Succeeded (${commands.filter(c => c.status === 'SUCCEEDED').length})`} />
            <Tab label={`Failed (${commands.filter(c => c.status === 'FAILED').length})`} />
          </Tabs>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Created By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(filteredCommands || []).map((command) => (
                  <TableRow key={command.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getActionIcon(command.action)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {command.action}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {command.target_type}: {command.target_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {command.ad_account_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={command.status}
                        color={getStatusColor(command.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(command.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {command.created_by}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Command</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Ad Account</InputLabel>
              <Select
                value={formData.ad_account_id}
                onChange={(e) => setFormData({ ...formData, ad_account_id: e.target.value })}
              >
                <MenuItem value="">No Ad Account (N/A)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Target Type</InputLabel>
              <Select
                value={formData.target_type}
                onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
              >
                <MenuItem value="AD">Ad</MenuItem>
                <MenuItem value="AD_SET">Ad Set</MenuItem>
                <MenuItem value="CAMPAIGN">Campaign</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Target ID (Meta ID)"
              value={formData.target_id}
              onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              >
                <MenuItem value="PAUSE">Pause</MenuItem>
                <MenuItem value="RESUME">Resume</MenuItem>
                <MenuItem value="STOP">Stop</MenuItem>
                <MenuItem value="SET_BUDGET">Set Budget</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Create Command
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Commands;
