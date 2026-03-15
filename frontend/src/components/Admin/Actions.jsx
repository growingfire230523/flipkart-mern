import { useState } from 'react';
import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

const Actions = ({ id, deleteHandler, name, editRoute }) => {

    const [open, setOpen] = useState(false);

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <div className="flex justify-between items-center gap-3">
                {editRoute !== "review" && (
                    <Link to={`/admin/${editRoute}/${id}`} className="text-primary-blue bg-white/70 border border-gray-200 hover:bg-primary-yellow/10 p-1 rounded-full">
                        <EditIcon />
                    </Link>
                )}
                <button onClick={() => setOpen(true)} className="text-primary-orange hover:bg-primary-orange/20 p-1 rounded-full bg-primary-orange/10">
                    <DeleteIcon />
                </button>
            </div>

            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
            >
                <DialogTitle id="alert-dialog-title">
                    {"Are you sure?"}
                </DialogTitle>
                <DialogContent>
                    <p className="text-primary-grey">Do you really want to delete{name && <span className="font-medium">&nbsp;{name}</span>}? This process cannot be undone.</p>
                </DialogContent>
                <DialogActions>
                    <button onClick={handleClose} className="py-2 px-6 rounded shadow-sm bg-white border border-gray-300 text-primary-darkBlue hover:bg-gray-50">Cancel</button>
                    <button onClick={() => deleteHandler(id)} className="py-2 px-6 ml-4 rounded bg-primary-orange hover:opacity-90 text-white shadow">Delete</button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Actions;
