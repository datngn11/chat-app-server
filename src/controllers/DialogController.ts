import { Request, Response } from "express";
import { Server } from "socket.io";

import DialogModel from "../models/Dialog";
import MessageModel from "../models/Message";

class DialogController {
  io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  index(req: Request, res: Response) {
    const userId = req.user?._id;

    DialogModel.find()
      .or([{ author: userId }, { partner: userId }])
      .populate(["author", "partner", "lastMessage"])
      .exec((err, dialogs) => {
        if (err || !dialogs.length) {
          return res.json({
            message: "Dialogs not found",
          });
        }
        return res.json(dialogs);
      });
  }

  create = (req: Request, res: Response) => {
    const { partner, text } = req.body;

    DialogModel.findOne(
      {
        author: req.user?._id,
        partner,
      },
      (err, dialog) => {
        if (err) {
          return res.status(500).json({
            err,
          });
        }
        if (dialog) {
          return res.status(403).json({
            message: "This dialog already exist",
          });
        } else {
          const dialog = new DialogModel({ author: req.user?._id, partner });
          dialog
            .save()
            .then((dialogObj) => {
              const message = new MessageModel({
                text,
                dialog: dialogObj._id,
                user: req.user?._id,
              });

              message
                .save()
                .then(() => {
                  dialogObj.lastMessage = message._id;
                  dialogObj.save().then(() => {
                    res.json(dialogObj);
                    this.io.emit("NEW_DIALOG", dialogObj, req.user);
                  });
                })
                .catch((err) => res.json(err));
            })
            .catch((err) => res.json(err));
        }
      }
    );
  };
}
export default DialogController;
